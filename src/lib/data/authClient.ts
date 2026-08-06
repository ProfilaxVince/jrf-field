"use client";
/**
 * Obtention d'une session Supabase valide, côté client.
 * Le token d'appareil est la source de vérité longue durée ; la session
 * Supabase, elle, expire. Après une coupure réseau, la file d'attente doit
 * pouvoir en redemander une AVANT de rejouer ses écritures — sinon RLS
 * rejette tout et la file se bloque sur une erreur qui n'est pas la sienne.
 */
import { supabase } from "./supabase";

export const DEVICE_TOKEN_KEY = "jrf_device_token";
export const SESSION_CACHE_KEY = "jrf_session_cache";

export type SessionServeur = {
  access_token: string;
  refresh_token: string;
  nickname: string;
  is_admin: boolean;
};

export async function rafraichirDepuisAppareil(): Promise<SessionServeur | null> {
  const deviceToken =
    typeof localStorage === "undefined" ? null : localStorage.getItem(DEVICE_TOKEN_KEY);
  if (!deviceToken) return null;
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_token: deviceToken }),
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(DEVICE_TOKEN_KEY);
        localStorage.removeItem(SESSION_CACHE_KEY);
      }
      return null;
    }
    const data: SessionServeur = await res.json();
    await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    return data;
  } catch {
    return null; // hors ligne : on ne casse pas la session en cache
  }
}

/** Session Supabase utilisable, en la redemandant au serveur si nécessaire. */
export async function assurerSession(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  return (await rafraichirDepuisAppareil()) !== null;
}
