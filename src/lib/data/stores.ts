"use client";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type StoreRow = Database["public"]["Tables"]["stores"]["Row"];
export type StoreInsert = Database["public"]["Tables"]["stores"]["Insert"];
export type StoreUpdate = Database["public"]["Tables"]["stores"]["Update"];

// Doit rester synchronisé avec `enseigne` / `region_type` (supabase/migrations/00001_initial_schema.sql).
export const ENSEIGNES: Database["public"]["Enums"]["enseigne"][] = [
  "intermarche",
  "ad_delhaize",
  "proxy_delhaize",
  "delhaize",
  "spar",
];
export const REGIONS: Database["public"]["Enums"]["region_type"][] = [
  "wallonie",
  "bruxelles",
  "flandre",
];

export async function listStores(): Promise<StoreRow[]> {
  const { data, error } = await supabase.from("stores").select("*").eq("active", true).order("name");
  if (error) throw error;
  return data;
}

export async function createStore(input: StoreInsert): Promise<StoreRow> {
  const { data, error } = await supabase.from("stores").insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateStore(id: string, patch: StoreUpdate): Promise<StoreRow> {
  const { data, error } = await supabase.from("stores").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

/** Pas de suppression physique : on désactive, le trigger d'audit trace le changement. */
export async function softDeleteStore(id: string): Promise<void> {
  const { error } = await supabase.from("stores").update({ active: false }).eq("id", id);
  if (error) throw error;
}

export async function importStores(rows: StoreInsert[]): Promise<StoreRow[]> {
  const { data, error } = await supabase.from("stores").insert(rows).select();
  if (error) throw error;
  return data;
}
