"use client";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type AbsenceRow = Database["public"]["Tables"]["absences"]["Row"];
export type MotifAbsence = Database["public"]["Enums"]["absence_type"];

export const MOTIFS: MotifAbsence[] = ["conges", "maladie", "formation", "autre"];

export async function listAbsencesFutures(depuis: string): Promise<AbsenceRow[]> {
  const { data, error } = await supabase
    .from("absences")
    .select("*")
    .eq("active", true)
    .gte("date_fin", depuis)
    .order("date_debut");
  if (error) throw error;
  return data;
}

export async function ajouterAbsence(absence: {
  userId: string;
  debut: string;
  fin: string;
  motif: MotifAbsence;
}): Promise<AbsenceRow> {
  const { data, error } = await supabase
    .from("absences")
    .insert({
      user_id: absence.userId,
      date_debut: absence.debut,
      date_fin: absence.fin,
      motif: absence.motif,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Pas de suppression physique : l'absence est désactivée, la capacité se recalcule. */
export async function retirerAbsence(id: string): Promise<void> {
  const { error } = await supabase.from("absences").update({ active: false }).eq("id", id);
  if (error) throw error;
}
