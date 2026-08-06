"use client";
import { supabase } from "./supabase";
import type { Database } from "./database.types";

export type AppUserRow = Database["public"]["Tables"]["app_users"]["Row"];

export async function listAppUsers(): Promise<AppUserRow[]> {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("active", true)
    .order("is_admin", { ascending: false })
    .order("nickname");
  if (error) throw error;
  return data;
}

/** Régénère le PIN d'un membre de l'équipe. Le nom d'utilisateur est son surnom. */
export async function generatePin(appUserId: string): Promise<{ pin: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("no_session");

  const res = await fetch("/api/admin/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ app_user_id: appUserId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "generate_failed");
  return data;
}

/** Active ou retire quelqu'un de la planification. Aucune suppression de compte. */
export async function definirPorteVisites(appUserId: string, porte: boolean): Promise<void> {
  const { error } = await supabase
    .from("app_users")
    .update({ porte_visites: porte })
    .eq("id", appUserId);
  if (error) throw error;
}

/**
 * Champs de la fiche. `full_name` n'y est pas : il se recompose tout seul
 * côté base à partir du prénom et du nom (migration 00015).
 * `email` est une donnée de fiche — on ne se connecte PAS avec.
 */
export type FicheCommercial = {
  first_name: string;
  last_name: string;
  nickname: string;
  email: string;
  phone: string;
  color_hex: string;
  is_admin: boolean;
  porte_visites: boolean;
};

/** Une case vide reste vide en base, pas une chaîne de zéro caractère. */
const vide = (v: string) => (v.trim() ? v.trim() : null);

function versLigne(f: FicheCommercial) {
  return {
    first_name: vide(f.first_name),
    last_name: vide(f.last_name),
    nickname: f.nickname.trim(),
    email: vide(f.email),
    phone: vide(f.phone),
    color_hex: f.color_hex,
    is_admin: f.is_admin,
    porte_visites: f.porte_visites,
  };
}

export async function creerCommercial(fiche: FicheCommercial): Promise<AppUserRow> {
  // `full_name` est NOT NULL en base mais le trigger de 00015 le compose avant
  // l'écriture. Il n'est volontairement pas envoyé d'ici : une seule source.
  const { data, error } = await supabase
    .from("app_users")
    .insert(versLigne(fiche))
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function modifierCommercial(
  appUserId: string,
  fiche: FicheCommercial
): Promise<AppUserRow> {
  const { data, error } = await supabase
    .from("app_users")
    .update(versLigne(fiche))
    .eq("id", appUserId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Retirer quelqu'un de l'équipe. Le compte n'est jamais supprimé : son
 * historique de visites doit rester lisible, et une suppression physique
 * l'emporterait avec lui.
 */
export async function retirerCommercial(appUserId: string): Promise<void> {
  const { error } = await supabase
    .from("app_users")
    .update({ active: false, porte_visites: false })
    .eq("id", appUserId);
  if (error) throw error;
}

/**
 * Défait un retrait pendant les 10 secondes de la barre d'annulation.
 * `porte_visites` est remis tel qu'il était : le retrait l'avait forcé à faux,
 * et le rendre à vrai d'office remettrait dans la planification quelqu'un qui
 * n'y était plus.
 */
export async function reactiverCommercial(
  appUserId: string,
  porteVisites: boolean
): Promise<void> {
  const { error } = await supabase
    .from("app_users")
    .update({ active: true, porte_visites: porteVisites })
    .eq("id", appUserId);
  if (error) throw error;
}
