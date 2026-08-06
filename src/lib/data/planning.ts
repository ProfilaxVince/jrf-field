"use client";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type VisitRow = Database["public"]["Tables"]["visits"]["Row"];
export type VisitInsert = Database["public"]["Tables"]["visits"]["Insert"];
export type RoutingRow = Database["public"]["Tables"]["routings"]["Row"];
export type AbsenceRow = Database["public"]["Tables"]["absences"]["Row"];
export type HolidayRow = Database["public"]["Tables"]["public_holidays"]["Row"];
export type LastVisitRow = Database["public"]["Views"]["v_store_last_visit"]["Row"];
export type DernierMontage = Pick<LastVisitRow, "store_id" | "last_montage_at">;

export async function listVisitsPeriode(debut: string, fin: string): Promise<VisitRow[]> {
  const { data, error } = await supabase
    .from("visits")
    .select("*")
    .gte("scheduled_date", debut)
    .lte("scheduled_date", fin)
    .eq("active", true)
    .order("scheduled_date")
    .order("position_in_day", { nullsFirst: true });
  if (error) throw error;
  return data;
}

export async function listAbsences(debut: string, fin: string): Promise<AbsenceRow[]> {
  const { data, error } = await supabase
    .from("absences")
    .select("*")
    .eq("active", true)
    .lte("date_debut", fin)
    .gte("date_fin", debut);
  if (error) throw error;
  return data;
}

export async function listHolidays(debut: string, fin: string): Promise<HolidayRow[]> {
  const { data, error } = await supabase
    .from("public_holidays")
    .select("*")
    .gte("jour", debut)
    .lte("jour", fin);
  if (error) throw error;
  return data;
}

export async function listDerniersMontages(): Promise<DernierMontage[]> {
  const { data, error } = await supabase
    .from("v_store_last_visit")
    .select("store_id, last_montage_at")
    .order("last_montage_at", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data;
}

/** Une tournée par personne et par jour (contrainte d'unicité en base). */
export async function assurerRouting(userId: string, date: string): Promise<string> {
  const existant = await supabase
    .from("routings")
    .select("id")
    .eq("user_id", userId)
    .eq("date", date)
    .maybeSingle();
  if (existant.error) throw existant.error;
  if (existant.data) return existant.data.id;

  const { data, error } = await supabase
    .from("routings")
    .insert({ user_id: userId, date })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function creerVisites(visites: VisitInsert[]): Promise<VisitRow[]> {
  if (visites.length === 0) return [];
  const { data, error } = await supabase.from("visits").insert(visites).select();
  if (error) throw error;
  return data;
}

/**
 * Retrait d'un arrêt planifié : jamais de suppression physique.
 * Une visite jamais réalisée sort du planning par `active = false` ;
 * une visite qui a eu lieu ne peut pas être retirée, seulement annulée.
 */
export async function retirerVisite(id: string, motif: string): Promise<void> {
  const { error } = await supabase
    .from("visits")
    .update({ active: false, motif_annulation: motif })
    .eq("id", id);
  if (error) throw error;
}

export async function restaurerVisites(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase
    .from("visits")
    .update({ active: true, motif_annulation: null })
    .in("id", ids);
  if (error) throw error;
}

export async function reordonner(positions: { id: string; position: number }[]): Promise<void> {
  await Promise.all(
    positions.map(({ id, position }) =>
      supabase
        .from("visits")
        .update({ position_in_day: position })
        .eq("id", id)
        .then(({ error }) => {
          if (error) throw error;
        })
    )
  );
}

export async function deplacerVisite(
  id: string,
  userId: string,
  date: string,
  position: number
): Promise<void> {
  const routingId = await assurerRouting(userId, date);
  const { error } = await supabase
    .from("visits")
    .update({ user_id: userId, scheduled_date: date, routing_id: routingId, position_in_day: position })
    .eq("id", id);
  if (error) throw error;
}
