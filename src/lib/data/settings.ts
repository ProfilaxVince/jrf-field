"use client";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type SettingRow = Database["public"]["Tables"]["app_settings"]["Row"];

/** Clés lues par l'application. Les valeurs vivent en base, jamais en dur. */
export type Settings = Map<string, unknown>;

export async function listSettings(): Promise<Settings> {
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) throw error;
  return new Map(data.map((row) => [row.key, row.value]));
}

export async function updateSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .update({ value: value as never, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (error) throw error;
}

export function nombre(settings: Settings, key: string, defaut: number): number {
  const brut = settings.get(key);
  const valeur = typeof brut === "string" ? Number(brut) : brut;
  return typeof valeur === "number" && Number.isFinite(valeur) ? valeur : defaut;
}

export function texte(settings: Settings, key: string, defaut: string): string {
  const brut = settings.get(key);
  return typeof brut === "string" ? brut : defaut;
}

export function objet(settings: Settings, key: string): Record<string, unknown> {
  const brut = settings.get(key);
  return brut !== null && typeof brut === "object" && !Array.isArray(brut)
    ? (brut as Record<string, unknown>)
    : {};
}
