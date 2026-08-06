"use client";
import { supabase } from "./supabase";
import type { AppUserRow } from "./users";

export type Assignment = { user_id: string; store_id: string };

/** Qui couvre quel magasin. Sert au liseré de couleur et à la planification. */
export async function listAssignments(): Promise<Assignment[]> {
  const { data, error } = await supabase.from("store_assignments").select("user_id, store_id");
  if (error) throw error;
  return data;
}

export async function assignStore(userId: string, storeId: string): Promise<void> {
  const { error } = await supabase
    .from("store_assignments")
    .insert({ user_id: userId, store_id: storeId });
  if (error) throw error;
}

/**
 * Exception assumée au « pas de suppression physique » : table de liaison sans
 * historique métier (décision du 02/08), le retrait reste tracé par audit_log.
 */
export async function unassignStore(userId: string, storeId: string): Promise<void> {
  const { error } = await supabase
    .from("store_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("store_id", storeId);
  if (error) throw error;
}

/** store_id → couleur de la personne qui le couvre (liseré gauche uniquement). */
export function couleursParMagasin(
  users: AppUserRow[],
  assignments: Assignment[]
): Map<string, string> {
  const couleurParUser = new Map(users.map((u) => [u.id, u.color_hex]));
  const resultat = new Map<string, string>();
  for (const a of assignments) {
    const couleur = couleurParUser.get(a.user_id);
    if (couleur) resultat.set(a.store_id, couleur);
  }
  return resultat;
}
