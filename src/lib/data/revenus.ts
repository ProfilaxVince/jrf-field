"use client";
/**
 * CA JRF par magasin et par exercice.
 *
 * `store_revenues` est la SOURCE. `stores.jrf_revenue_eur` et
 * `jrf_revenue_year` n'en sont que le reflet de l'exercice le plus récent,
 * entretenu par un trigger (migration 00018) — il ne faut donc jamais les
 * écrire directement depuis l'application, sous peine de faire diverger le
 * magasin de son propre historique jusqu'à la prochaine saisie de CA.
 */
import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type RevenuRow = Database["public"]["Tables"]["store_revenues"]["Row"];
export type EvolutionRow = Database["public"]["Views"]["v_store_revenue_evolution"]["Row"];

/** Les exercices d'un magasin, le plus récent d'abord. */
export async function listRevenus(storeId: string): Promise<RevenuRow[]> {
  const { data, error } = await supabase
    .from("store_revenues")
    .select("*")
    .eq("store_id", storeId)
    .order("year", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Enregistre le CA d'un exercice. `upsert` sur (magasin, exercice) : ressaisir
 * 2026 corrige 2026 au lieu d'ajouter une seconde ligne — la contrainte
 * d'unicité refuserait de toute façon.
 */
export async function enregistrerRevenu(
  storeId: string,
  year: number,
  amountEur: number
): Promise<RevenuRow> {
  const { data, error } = await supabase
    .from("store_revenues")
    .upsert(
      { store_id: storeId, year, amount_eur: amountEur, updated_at: new Date().toISOString() },
      { onConflict: "store_id,year" }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Retire un exercice. Seule suppression physique du produit, assumée en 00018 :
 * un montant saisi sur le mauvais exercice n'a pas d'histoire à conserver, et
 * le garder « désactivé » fausserait le calcul de l'exercice le plus récent.
 * L'`audit_log` en garde la trace.
 */
export async function retirerRevenu(id: string): Promise<void> {
  const { error } = await supabase.from("store_revenues").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Évolution d'un exercice à l'autre, tous magasins actifs confondus.
 * L'écart se calcule sur l'exercice précédent RÉELLEMENT connu du magasin :
 * un trou en 2025 compare 2026 à 2024 plutôt que d'afficher une case vide.
 */
export async function listEvolutions(): Promise<EvolutionRow[]> {
  const { data, error } = await supabase
    .from("v_store_revenue_evolution")
    .select("*")
    .not("ecart_pct", "is", null)
    .order("exercice", { ascending: false });
  if (error) throw error;
  return data;
}
