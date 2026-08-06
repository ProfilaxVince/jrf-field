"use client";
/**
 * Tournée du jour du commercial. Règle non négociable : la tournée s'affiche
 * DEPUIS LE CACHE avant tout appel réseau. Le réseau ne fait que rafraîchir.
 * Toutes les écritures passent par l'outbox — jamais d'appel Supabase direct.
 */
import { supabase } from "./supabase";
import { STORE_CACHE, idbGet, idbPut } from "./idb";
import { BUCKET_PHOTOS, enfiler, stockerBlob } from "./outbox";
import { listStores } from "./stores";
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

/**
 * La clé porte l'utilisateur : l'Admin porte aussi un portefeuille, et deux
 * personnes peuvent se connecter sur le même appareil. Une clé par date seule
 * ferait apparaître la tournée d'un collègue.
 */
const cleCache = (userId: string, date: string) => `tournee:${userId}:${date}`;

export async function lireTourneeCache(
  userId: string,
  date: string
): Promise<TourneeCache | null> {
  try {
    return (await idbGet<TourneeCache>(STORE_CACHE, cleCache(userId, date))) ?? null;
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

/**
 * Rafraîchit depuis le réseau. Le filtre `user_id` est explicite et NON
 * redondant : RLS laisse l'Admin lire toutes les visites, or l'Admin porte
 * lui aussi un portefeuille — sans ce filtre, sa « tournée du jour »
 * afficherait celle de toute l'équipe.
 */
export async function chargerTourneeReseau(userId: string, date: string): Promise<TourneeCache> {
  const visites = await supabase
    .from("visits")
    .select("*")
    .eq("user_id", userId)
    .eq("scheduled_date", date)
    .eq("active", true)
    .order("position_in_day", { nullsFirst: true });
  if (visites.error) throw visites.error;

  const storeIds = [...new Set(visites.data.map((v) => v.store_id))];
  const magasins = storeIds.length
    ? await supabase.from("stores").select("*").in("id", storeIds)
    : { data: [] as StoreRow[], error: null };
  if (magasins.error) throw magasins.error;

  const precedent = await lireTourneeCache(userId, date);
  const tournee: TourneeCache = {
    key: cleCache(userId, date),
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
  userId: string,
  date: string,
  visitId: string,
  patch: Partial<VisitRow>
): Promise<TourneeCache | null> {
  const cache = await lireTourneeCache(userId, date);
  if (!cache) return null;
  const majee: TourneeCache = {
    ...cache,
    visites: cache.visites.map((v) => (v.id === visitId ? { ...v, ...patch } : v)),
    majLe: new Date().toISOString(),
  };
  await ecrireTourneeCache(majee);
  return majee;
}

/**
 * Catalogue complet des magasins, mis en cache pour que le commercial puisse
 * ajouter un arrêt ou déclarer une urgence SANS réseau. Rafraîchi en silence
 * à chaque ouverture de la tournée.
 */
const CLE_CATALOGUE = "catalogue-magasins";

export async function lireCatalogue(): Promise<StoreRow[]> {
  try {
    const entree = await idbGet<{ key: string; magasins: StoreRow[] }>(STORE_CACHE, CLE_CATALOGUE);
    return entree?.magasins ?? [];
  } catch {
    return [];
  }
}

export async function rafraichirCatalogue(): Promise<StoreRow[]> {
  const magasins = await listStores();
  try {
    await idbPut(STORE_CACHE, { key: CLE_CATALOGUE, magasins });
  } catch {
    // Cache indisponible : l'ajout d'arrêt restera possible en ligne.
  }
  return magasins;
}

export type Position = { lat: number; lng: number } | null;

export type TypeArret = "conseil" | "urgence" | "montage_rayon";

/**
 * Le commercial ajoute un arrêt à SA journée. L'identifiant est généré ici :
 * l'arrêt doit apparaître tout de suite, même hors ligne, et garder le même
 * identifiant après envoi — sinon un compte rendu saisi avant la
 * synchronisation viserait une visite inexistante.
 */
export async function ajouterArretTerrain(
  userId: string,
  date: string,
  store: StoreRow,
  type: TypeArret
): Promise<TourneeCache | null> {
  const cache = await lireTourneeCache(userId, date);
  const existantes = cache?.visites ?? [];
  const position =
    type === "urgence" || type === "montage_rayon"
      ? 0 // une urgence et le montage de 6 h ouvrent la journée
      : existantes.reduce((max, v) => Math.max(max, v.position_in_day ?? 0), 0) + 1;

  const payload = {
    id: crypto.randomUUID(),
    store_id: store.id,
    user_id: userId,
    scheduled_date: date,
    visit_type: type,
    status: "planifiee" as const,
    position_in_day: position,
  };
  await enfiler({ kind: "visit_create", payload });

  if (!cache) return null;
  const majee: TourneeCache = {
    ...cache,
    visites: [...cache.visites, payload as unknown as VisitRow].sort(
      (a, b) => (a.position_in_day ?? 0) - (b.position_in_day ?? 0)
    ),
    magasins: cache.magasins.some((m) => m.id === store.id)
      ? cache.magasins
      : [...cache.magasins, store],
    majLe: new Date().toISOString(),
  };
  await ecrireTourneeCache(majee);
  return majee;
}

/**
 * Urgence de livraison : la visite est créée localement (elle doit apparaître
 * immédiatement dans la tournée), puis l'incident est mis en file. Le trigger
 * en base se rattache à la visite existante au lieu d'en créer une seconde,
 * annule le montage de rayon du matin et remonte l'alerte au responsable.
 * Une urgence compte comme une visite pleine : elle remet la dette à zéro.
 */
export async function declarerUrgenceLivraison(
  userId: string,
  date: string,
  store: StoreRow,
  description: string
): Promise<TourneeCache | null> {
  const cache = await ajouterArretTerrain(userId, date, store, "urgence");
  await enfiler({
    kind: "incident_create",
    payload: {
      store_id: store.id,
      reported_by: userId,
      incident_type: "oubli_livraison",
      criticality: 3,
      description: description.trim() || null,
      created_at: new Date().toISOString(),
    },
  });
  return cache;
}

/** Retrait d'un arrêt par le commercial. Jamais de suppression physique. */
export async function retirerArretTerrain(
  userId: string,
  date: string,
  visitId: string,
  motif: string
): Promise<TourneeCache | null> {
  const patch = { active: false, motif_annulation: motif };
  const cache = await lireTourneeCache(userId, date);
  await enfiler({ kind: "visit_update", visitId, patch });
  if (!cache) return null;
  const majee: TourneeCache = {
    ...cache,
    visites: cache.visites.filter((v) => v.id !== visitId),
    majLe: new Date().toISOString(),
  };
  await ecrireTourneeCache(majee);
  return majee;
}

/** Déplace un arrêt d'un cran. Le montage et les urgences restent en tête. */
export async function deplacerArretTerrain(
  userId: string,
  date: string,
  visitId: string,
  sens: -1 | 1
): Promise<TourneeCache | null> {
  const cache = await lireTourneeCache(userId, date);
  if (!cache) return null;
  const deplacables = cache.visites
    .filter((v) => v.visit_type === "conseil" || v.visit_type === "demo" || v.visit_type === "rattrapage")
    .sort((a, b) => (a.position_in_day ?? 0) - (b.position_in_day ?? 0));
  const index = deplacables.findIndex((v) => v.id === visitId);
  const cible = index + sens;
  if (index < 0 || cible < 0 || cible >= deplacables.length) return cache;
  [deplacables[index], deplacables[cible]] = [deplacables[cible], deplacables[index]];

  const positions = new Map(deplacables.map((v, i) => [v.id, i + 1]));
  for (const [id, position] of positions) {
    await enfiler({ kind: "visit_update", visitId: id, patch: { position_in_day: position } });
  }
  const majee: TourneeCache = {
    ...cache,
    visites: cache.visites
      .map((v) => (positions.has(v.id) ? { ...v, position_in_day: positions.get(v.id) as number } : v))
      .sort((a, b) => (a.position_in_day ?? 0) - (b.position_in_day ?? 0)),
    majLe: new Date().toISOString(),
  };
  await ecrireTourneeCache(majee);
  return majee;
}

/**
 * Arrivée en magasin. La géolocalisation est PONCTUELLE et facultative
 * (RGPD / CCT n°81) : elle est demandée à ce moment précis, jamais en continu,
 * et un refus n'empêche pas le check-in.
 */
export async function demarrerVisite(
  userId: string,
  date: string,
  visitId: string,
  position: Position
): Promise<TourneeCache | null> {
  const patch = {
    checkin_at: new Date().toISOString(),
    checkin_lat: position?.lat ?? null,
    checkin_lng: position?.lng ?? null,
  };
  const cache = await patcherCache(userId, date, visitId, patch);
  await enfiler({ kind: "visit_update", visitId, patch });
  return cache;
}

export async function terminerVisite(
  userId: string,
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
  const cache = await patcherCache(userId, date, visitId, patch);
  await enfiler({ kind: "visit_update", visitId, patch });
  return cache;
}

export async function reporterVisite(
  userId: string,
  date: string,
  visitId: string,
  motif: string
): Promise<TourneeCache | null> {
  const patch = { status: "reportee" as const, motif_annulation: motif };
  const cache = await patcherCache(userId, date, visitId, patch);
  await enfiler({ kind: "visit_update", visitId, patch });
  return cache;
}

/** Compresse, range le blob, puis met l'envoi en file. Rien n'attend le réseau. */
export async function ajouterPhoto(
  userId: string,
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
  const cache = await lireTourneeCache(userId, date);
  if (!cache) return null;
  const majee: TourneeCache = {
    ...cache,
    photos: [...cache.photos, { visitId, position, blobKey }],
  };
  await ecrireTourneeCache(majee);
  return majee;
}

export { BUCKET_PHOTOS };
