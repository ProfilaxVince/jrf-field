"use client";
/**
 * Photos de rayon, côté consultation.
 *
 * Le bucket est PRIVÉ : une photo de linéaire est une donnée client. On ne
 * peut donc pas construire une URL publique — il faut demander à Supabase une
 * URL signée, valable une heure. C'est aussi ce qui fait que ces images ne
 * fuient pas si quelqu'un partage un lien.
 */
import { supabase } from "./supabase";
import { BUCKET_PHOTOS } from "./outbox";
import type { Database } from "./database.types";

export type PhotoRow = Database["public"]["Tables"]["visit_photos"]["Row"];

const VALIDITE_SECONDES = 3600;

export async function listPhotosDeVisites(visitIds: string[]): Promise<PhotoRow[]> {
  if (visitIds.length === 0) return [];
  const { data, error } = await supabase
    .from("visit_photos")
    .select("*")
    .in("visit_id", visitIds)
    .eq("active", true)
    .order("position");
  if (error) throw error;
  return data;
}

/** chemin de stockage → URL affichable. Les échecs sont ignorés photo par photo. */
export async function urlsSignees(chemins: string[]): Promise<Map<string, string>> {
  const resultat = new Map<string, string>();
  if (chemins.length === 0) return resultat;
  const { data, error } = await supabase.storage
    .from(BUCKET_PHOTOS)
    .createSignedUrls(chemins, VALIDITE_SECONDES);
  if (error || !data) return resultat;
  for (const entree of data) {
    if (entree.signedUrl && entree.path) resultat.set(entree.path, entree.signedUrl);
  }
  return resultat;
}
