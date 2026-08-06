"use client";
import { supabase } from "./supabase";
import type { Database } from "./database.types";
import type { StoreRow } from "./stores";

export type DetteRow = Database["public"]["Views"]["v_store_dette"]["Row"];
export type DiagnosticCapacite = Database["public"]["Views"]["v_diagnostic_capacite"]["Row"];
export type DeriveTiers = Database["public"]["Views"]["v_derive_tiers_resume"]["Row"];

/**
 * Un magasin + sa dette, prêts à afficher. Le front n'invente aucun calcul :
 * dette, fréquence cible et score de priorité viennent de `v_store_dette`.
 * L'assemblage magasin ↔ dette se fait ici parce qu'une vue n'a pas de clé
 * étrangère : PostgREST ne sait pas la joindre, il faut deux lectures.
 */
export type StorePriorite = {
  store: StoreRow;
  dette: DetteRow;
};

export async function listStorePriorites(): Promise<StorePriorite[]> {
  const [stores, dettes] = await Promise.all([
    supabase.from("stores").select("*").eq("active", true),
    supabase.from("v_store_dette").select("*").order("score_priorite", { ascending: false }),
  ]);
  if (stores.error) throw stores.error;
  if (dettes.error) throw dettes.error;

  const parStoreId = new Map(stores.data.map((s) => [s.id, s]));
  return dettes.data.flatMap((dette) => {
    const store = dette.store_id ? parStoreId.get(dette.store_id) : undefined;
    return store ? [{ store, dette }] : [];
  });
}

export async function getDiagnosticCapacite(): Promise<DiagnosticCapacite | null> {
  const { data, error } = await supabase.from("v_diagnostic_capacite").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDeriveTiers(): Promise<DeriveTiers | null> {
  const { data, error } = await supabase.from("v_derive_tiers_resume").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

/** Recalcul explicite des tiers figés — action Admin, jamais automatique. */
export async function recalculerTiers(): Promise<
  Database["public"]["Functions"]["recalculer_tiers"]["Returns"]
> {
  const { data, error } = await supabase.rpc("recalculer_tiers");
  if (error) throw error;
  return data;
}
