"use client";
/**
 * File d'attente hors-ligne. TOUTE mutation du portail commercial passe ici :
 * on écrit d'abord dans la file, on tente ensuite le réseau. Sur le terrain,
 * le réseau n'est pas une hypothèse de travail.
 *
 * Garanties :
 *   · ordre d'écriture respecté (une visite est démarrée avant d'être terminée) ;
 *   · rejeu automatique au retour du réseau et au démarrage de l'application ;
 *   · une opération qui échoue bloque la file — elle n'est jamais perdue,
 *     et les suivantes ne peuvent pas la doubler.
 */
import { supabase } from "./supabase";
import { STORE_BLOBS, STORE_OUTBOX, idbAdd, idbDelete, idbGet, idbGetAll, idbPut } from "./idb";
import { assurerSession } from "./authClient";
import type { Database } from "./database.types";

export type VisitUpdate = Database["public"]["Tables"]["visits"]["Update"];
export type VisitInsert = Database["public"]["Tables"]["visits"]["Insert"];
export type IncidentInsert = Database["public"]["Tables"]["incidents"]["Insert"];

export type Operation =
  /**
   * Le commercial ajoute un arrêt à SA journée. L'identifiant est généré côté
   * client : l'arrêt doit exister dans la tournée immédiatement, hors ligne,
   * et garder le même identifiant une fois envoyé — sinon un compte rendu
   * saisi avant la synchronisation viserait une visite qui n'existe pas.
   */
  | { kind: "visit_create"; payload: VisitInsert }
  | { kind: "visit_update"; visitId: string; patch: VisitUpdate }
  | { kind: "incident_create"; payload: IncidentInsert }
  | {
      kind: "photo_upload";
      visitId: string;
      position: number;
      blobKey: string;
      storagePath: string;
      bytes: number;
      width: number;
      height: number;
      takenAt: string;
    };

type EntreeOutbox = { id?: number; op: Operation; creeeLe: string; tentatives: number };

export const BUCKET_PHOTOS = "visit-photos";

const abonnes = new Set<(taille: number) => void>();

export function surChangementOutbox(callback: (taille: number) => void): () => void {
  abonnes.add(callback);
  return () => abonnes.delete(callback);
}

async function notifier() {
  const taille = (await idbGetAll<EntreeOutbox>(STORE_OUTBOX)).length;
  for (const abonne of abonnes) abonne(taille);
}

export async function tailleOutbox(): Promise<number> {
  try {
    return (await idbGetAll<EntreeOutbox>(STORE_OUTBOX)).length;
  } catch {
    return 0;
  }
}

/** Met une photo compressée de côté avant l'envoi (les blobs ne tiennent pas en localStorage). */
export async function stockerBlob(key: string, blob: Blob): Promise<void> {
  await idbPut(STORE_BLOBS, { key, blob });
}

/** Ajoute une opération à la file puis tente immédiatement de la vider. */
export async function enfiler(op: Operation): Promise<void> {
  await idbAdd<EntreeOutbox>(STORE_OUTBOX, { op, creeeLe: new Date().toISOString(), tentatives: 0 });
  await notifier();
  void viderOutbox();
}

let videEnCours = false;

/** Rejoue la file dans l'ordre. S'arrête à la première opération qui échoue. */
export async function viderOutbox(): Promise<{ envoyees: number; restantes: number }> {
  if (videEnCours) return { envoyees: 0, restantes: await tailleOutbox() };
  videEnCours = true;
  let envoyees = 0;
  try {
    const entrees = (await idbGetAll<EntreeOutbox>(STORE_OUTBOX)).sort(
      (a, b) => (a.id ?? 0) - (b.id ?? 0)
    );
    if (entrees.length === 0) return { envoyees: 0, restantes: 0 };

    const session = await assurerSession();
    if (!session) return { envoyees: 0, restantes: entrees.length };

    for (const entree of entrees) {
      const ok = await appliquer(entree.op);
      if (!ok) break;
      if (entree.id !== undefined) await idbDelete(STORE_OUTBOX, entree.id);
      envoyees += 1;
    }
    return { envoyees, restantes: await tailleOutbox() };
  } catch {
    return { envoyees, restantes: await tailleOutbox() };
  } finally {
    videEnCours = false;
    await notifier();
  }
}

async function appliquer(op: Operation): Promise<boolean> {
  try {
    if (op.kind === "visit_create") {
      const { error } = await supabase.from("visits").insert(op.payload);
      // Un doublon signifie que l'opération est déjà passée : on ne bloque pas.
      return !error || error.code === "23505";
    }
    if (op.kind === "visit_update") {
      const { error } = await supabase.from("visits").update(op.patch).eq("id", op.visitId);
      return !error;
    }
    if (op.kind === "incident_create") {
      const { error } = await supabase.from("incidents").insert(op.payload);
      return !error;
    }
    const enregistre = await idbGet<{ key: string; blob: Blob }>(STORE_BLOBS, op.blobKey);
    if (!enregistre) return true; // blob purgé par le navigateur : on n'immobilise pas la file
    const upload = await supabase.storage
      .from(BUCKET_PHOTOS)
      .upload(op.storagePath, enregistre.blob, { contentType: "image/jpeg", upsert: true });
    if (upload.error) return false;
    const { error } = await supabase.from("visit_photos").insert({
      visit_id: op.visitId,
      storage_path: op.storagePath,
      position: op.position,
      bytes: op.bytes,
      width: op.width,
      height: op.height,
      taken_at: op.takenAt,
    });
    if (error) return false;
    await idbDelete(STORE_BLOBS, op.blobKey);
    return true;
  } catch {
    return false; // panne réseau : on retentera, rien n'est perdu
  }
}

/** Rejeu automatique : retour du réseau, retour au premier plan, démarrage. */
export function installerRejeuAutomatique(): () => void {
  if (typeof window === "undefined") return () => {};
  const rejouer = () => void viderOutbox();
  window.addEventListener("online", rejouer);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") rejouer();
  });
  rejouer();
  return () => window.removeEventListener("online", rejouer);
}
