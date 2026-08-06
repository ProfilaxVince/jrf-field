"use client";
/**
 * Tournée du jour du commercial. Règle non négociable : la tournée s'affiche
 * DEPUIS LE CACHE avant tout appel réseau. Le réseau ne fait que rafraîchir.
 * Toutes les écritures passent par l'outbox — jamais d'appel Supabase direct.
 */
import { supabase } from "./supabase";
import { STORE_CACHE, idbGet, idbPut } from "./idb";
import { BUCKET_PHOTOS, enfiler, stockerBlob } from "./outbox";
import { compresserPhoto } from "../photos";
import type { CompteRendu, SaisieCompteRendu } from "../domain/compte-rendu";
import type { VisitRow } from "./planning";
import type { StoreRow } from "./stores";

export type PhotoLocale = { visitId: string; position: number; blobKey: string };

export type TourneeCache = {
  key: string;
  date: string;
  visites: VisitRow[];
  magasins: StoreRow[];
  photos: PhotoLocale[];
  majLe: string;
};

const cleCache = (date: string) => `tournee:${date}`;

export async function lireTourneeCache(date: string): Promise<TourneeCache | null> {
  try {
    return (await idbGet<TourneeCache>(STORE_CACHE, cleCache(date))) ?? null;
  } catch {
    return null;
  }
}

async function ecrireTourneeCache(tournee: TourneeCache): Promise<void> {
  try {
    await idbPut(STORE_CACHE, tournee);
  } catch {
    // Cache indisponible (mode privé) : l'application reste utilisable en ligne.
  }
}

/** Rafraîchit depuis le réseau. RLS ne renvoie que les visites du porteur connecté. */
export async function chargerTourneeReseau(date: string): Promise<TourneeCache> {
  const visites = await supabase
    .from("visits")
    .select("*")
    .eq("scheduled_date", date)
    .eq("active", true)
    .order("position_in_day", { nullsFirst: true });
  if (visites.error) throw visites.error;

  const storeIds = [...new Set(visites.data.map((v) => v.store_id))];
  const magasins = storeIds.length
    ? await supabase.from("stores").select("*").in("id", storeIds)
    : { data: [] as StoreRow[], error: null };
  if (magasins.error) throw magasins.error;

  const precedent = await lireTourneeCache(date);
  const tournee: TourneeCache = {
    key: cleCache(date),
    date,
    visites: visites.data,
    magasins: magasins.data,
    photos: precedent?.photos ?? [],
    majLe: new Date().toISOString(),
  };
  await ecrireTourneeCache(tournee);
  return tournee;
}

/** Applique un changement au cache local pour que l'écran réponde hors ligne. */
async function patcherCache(
  date: string,
  visitId: string,
  patch: Partial<VisitRow>
): Promise<TourneeCache | null> {
  const cache = await lireTourneeCache(date);
  if (!cache) return null;
  const majee: TourneeCache = {
    ...cache,
    visites: cache.visites.map((v) => (v.id === visitId ? { ...v, ...patch } : v)),
    majLe: new Date().toISOString(),
  };
  await ecrireTourneeCache(majee);
  return majee;
}

export type Position = { lat: number; lng: number } | null;

/**
 * Arrivée en magasin. La géolocalisation est PONCTUELLE et facultative
 * (RGPD / CCT n°81) : elle est demandée à ce moment précis, jamais en continu,
 * et un refus n'empêche pas le check-in.
 */
export async function demarrerVisite(
  date: string,
  visitId: string,
  position: Position
): Promise<TourneeCache | null> {
  const patch = {
    checkin_at: new Date().toISOString(),
    checkin_lat: position?.lat ?? null,
    checkin_lng: position?.lng ?? null,
  };
  const cache = await patcherCache(date, visitId, patch);
  await enfiler({ kind: "visit_update", visitId, patch });
  return cache;
}

export async function terminerVisite(
  date: string,
  visitId: string,
  saisie: SaisieCompteRendu,
  nbPhotos: number
): Promise<TourneeCache | null> {
  const maintenant = new Date().toISOString();
  const report: CompteRendu = {
    message_centrale: saisie.relaisCentrale ? saisie.messageCentrale.trim() : undefined,
    ruptures: saisie.ruptures.trim() || undefined,
    photos: nbPhotos,
  };
  const patch = {
    status: "faite" as const,
    checkout_at: maintenant,
    report_submitted_at: maintenant,
    notes: saisie.notes.trim() || null,
    rayon_conforme: saisie.rayonConforme,
    relais_centrale: saisie.relaisCentrale,
    report,
  };
  const cache = await patcherCache(date, visitId, patch);
  await enfiler({ kind: "visit_update", visitId, patch });
  return cache;
}

export async function reporterVisite(
  date: string,
  visitId: string,
  motif: string
): Promise<TourneeCache | null> {
  const patch = { status: "reportee" as const, motif_annulation: motif };
  const cache = await patcherCache(date, visitId, patch);
  await enfiler({ kind: "visit_update", visitId, patch });
  return cache;
}

/** Compresse, range le blob, puis met l'envoi en file. Rien n'attend le réseau. */
export async function ajouterPhoto(
  date: string,
  visitId: string,
  position: number,
  fichier: File
): Promise<TourneeCache | null> {
  const photo = await compresserPhoto(fichier);
  const blobKey = `${visitId}-${position}-${Date.now()}`;
  const storagePath = `${visitId}/${position}-${Date.now()}.jpg`;
  await stockerBlob(blobKey, photo.blob);
  await enfiler({
    kind: "photo_upload",
    visitId,
    position,
    blobKey,
    storagePath,
    bytes: photo.bytes,
    width: photo.width,
    height: photo.height,
    takenAt: new Date().toISOString(),
  });
  const cache = await lireTourneeCache(date);
  if (!cache) return null;
  const majee: TourneeCache = {
    ...cache,
    photos: [...cache.photos, { visitId, position, blobKey }],
  };
  await ecrireTourneeCache(majee);
  return majee;
}

export { BUCKET_PHOTOS };
