"use client";
import { supabase } from "./supabase";
import { enfiler } from "./outbox";
import type { Database } from "./database.types";
import type { VisitRow } from "./planning";

export type IncidentRow = Database["public"]["Tables"]["incidents"]["Row"];
export type IncidentInsert = Database["public"]["Tables"]["incidents"]["Insert"];
export type TypeIncident = Database["public"]["Enums"]["incident_type"];
export type StatutIncident = Database["public"]["Enums"]["incident_status"];

export const TYPES_INCIDENT: TypeIncident[] = [
  "oubli_livraison",
  "rupture",
  "litige_qualite",
  "autre",
];

/**
 * Signalement terrain — passe par l'outbox comme toute mutation du portail
 * commercial. `created_at` est porté par le client : un incident saisi hors
 * ligne garde son heure réelle, ce dont dépend la règle « l'urgence remplace
 * le montage du jour » (trigger `incidents_urgence_trg`).
 */
export async function signalerIncident(payload: {
  storeId: string;
  reportedBy: string;
  type: TypeIncident;
  criticite: 1 | 2 | 3;
  description: string;
}): Promise<void> {
  await enfiler({
    kind: "incident_create",
    payload: {
      store_id: payload.storeId,
      reported_by: payload.reportedBy,
      incident_type: payload.type,
      criticality: payload.criticite,
      description: payload.description.trim() || null,
      created_at: new Date().toISOString(),
    },
  });
}

export async function listIncidents(statuts: StatutIncident[]): Promise<IncidentRow[]> {
  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("active", true)
    .in("status", statuts)
    .order("criticality", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function changerStatutIncident(id: string, statut: StatutIncident): Promise<void> {
  const { error } = await supabase
    .from("incidents")
    .update({
      status: statut,
      resolved_at: statut === "resolu" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Comptes rendus marqués « à remonter à la centrale ». */
export async function listRelaisCentrale(depuis: string): Promise<VisitRow[]> {
  const { data, error } = await supabase
    .from("visits")
    .select("*")
    .eq("active", true)
    .eq("relais_centrale", true)
    .not("report_submitted_at", "is", null)
    .gte("scheduled_date", depuis)
    .order("scheduled_date", { ascending: false });
  if (error) throw error;
  return data;
}
