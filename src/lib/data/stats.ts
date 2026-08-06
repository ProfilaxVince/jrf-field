"use client";
/**
 * Lecture des vues statistiques. Aucune agrégation ici : tout est calculé en SQL
 * (décision fondatrice). Le seul traitement autorisé côté client est le tri et
 * la sélection des N premières lignes à afficher.
 */
import { supabase } from "./supabase";
import type { Database } from "./database.types";

type Views = Database["public"]["Views"];
export type StatsParc = Views["v_stats_parc"]["Row"];
export type CouvertureMensuelle = Views["v_couverture_mensuelle"]["Row"];
export type EffortParTier = Views["v_stats_effort_par_tier"]["Row"];
export type FrequenceReelle = Views["v_frequence_reelle_magasin"]["Row"];
export type SuiviMontage = Views["v_suivi_montage_mois"]["Row"];
export type RotationMontage = Views["v_rotation_montage"]["Row"];
export type ChargeSemaine = Views["v_charge_semaine"]["Row"];

export async function statsParc(): Promise<StatsParc[]> {
  const { data, error } = await supabase.from("v_stats_parc").select("*");
  if (error) throw error;
  return data;
}

export async function couvertureMensuelle(limite = 12): Promise<CouvertureMensuelle[]> {
  const { data, error } = await supabase
    .from("v_couverture_mensuelle")
    .select("*")
    .order("mois", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}

export async function effortParTier(): Promise<EffortParTier[]> {
  const { data, error } = await supabase.from("v_stats_effort_par_tier").select("*").order("tier");
  if (error) throw error;
  return data;
}

/** Les magasins dont la fréquence réelle s'écarte le plus de la fréquence visée. */
export async function pireEcartFrequence(limite = 10): Promise<FrequenceReelle[]> {
  const { data, error } = await supabase
    .from("v_frequence_reelle_magasin")
    .select("*")
    .not("ecart_jours", "is", null)
    .order("ecart_jours", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}

export async function suiviMontage(limite = 6): Promise<SuiviMontage[]> {
  const { data, error } = await supabase
    .from("v_suivi_montage_mois")
    .select("*")
    .order("mois", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return data;
}

export async function rotationMontage(): Promise<RotationMontage | null> {
  const { data, error } = await supabase.from("v_rotation_montage").select("*").maybeSingle();
  if (error) throw error;
  return data;
}

export async function chargeSemaine(anneeIso: number): Promise<ChargeSemaine[]> {
  const { data, error } = await supabase
    .from("v_charge_semaine")
    .select("*")
    .eq("annee_iso", anneeIso)
    .order("semaine_iso");
  if (error) throw error;
  return data;
}
