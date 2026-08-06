"use client";
/**
 * Modèles de tournée : une liste ordonnée de magasins qu'on rejoue sur une
 * journée. C'est la brique de planification manuelle — l'Admin compose ses
 * tournées habituelles une fois, puis les applique.
 */
import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type TemplateRow = Database["public"]["Tables"]["routing_templates"]["Row"];
export type TemplateStopRow = Database["public"]["Tables"]["routing_template_stops"]["Row"];

export async function listTemplates(): Promise<TemplateRow[]> {
  const { data, error } = await supabase
    .from("routing_templates")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) throw error;
  return data;
}

export async function listStops(templateId: string): Promise<TemplateStopRow[]> {
  const { data, error } = await supabase
    .from("routing_template_stops")
    .select("*")
    .eq("template_id", templateId)
    .order("position");
  if (error) throw error;
  return data;
}

/** Tous les arrêts de tous les modèles — évite N requêtes sur l'écran de liste. */
export async function listTousLesStops(): Promise<TemplateStopRow[]> {
  const { data, error } = await supabase
    .from("routing_template_stops")
    .select("*")
    .order("position");
  if (error) throw error;
  return data;
}

export async function creerTemplate(
  name: string,
  zone: string | null,
  createdBy: string
): Promise<TemplateRow> {
  const { data, error } = await supabase
    .from("routing_templates")
    .insert({ name: name.trim(), zone: zone?.trim() || null, created_by: createdBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renommerTemplate(
  id: string,
  name: string,
  zone: string | null
): Promise<void> {
  const { error } = await supabase
    .from("routing_templates")
    .update({ name: name.trim(), zone: zone?.trim() || null })
    .eq("id", id);
  if (error) throw error;
}

/** Pas de suppression physique : le modèle est archivé. */
export async function archiverTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("routing_templates").update({ active: false }).eq("id", id);
  if (error) throw error;
}

export async function ajouterStop(
  templateId: string,
  storeId: string,
  position: number
): Promise<TemplateStopRow> {
  const { data, error } = await supabase
    .from("routing_template_stops")
    .insert({ template_id: templateId, store_id: storeId, position })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Exception au « pas de suppression » assumée pour la même raison que
 * `store_assignments` : table de composition sans historique métier.
 */
export async function retirerStop(templateId: string, storeId: string): Promise<void> {
  const { error } = await supabase
    .from("routing_template_stops")
    .delete()
    .eq("template_id", templateId)
    .eq("store_id", storeId);
  if (error) throw error;
}

export async function reordonnerStops(
  templateId: string,
  storeIdsOrdonnes: string[]
): Promise<void> {
  await Promise.all(
    storeIdsOrdonnes.map((storeId, index) =>
      supabase
        .from("routing_template_stops")
        .update({ position: index + 1 })
        .eq("template_id", templateId)
        .eq("store_id", storeId)
        .then(({ error }) => {
          if (error) throw error;
        })
    )
  );
}
