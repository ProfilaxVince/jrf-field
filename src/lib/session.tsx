"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./data/supabase";
import {
  DEVICE_TOKEN_KEY,
  SESSION_CACHE_KEY,
  rafraichirDepuisAppareil,
  type SessionServeur,
} from "./data/authClient";
import { installerRejeuAutomatique } from "./data/outbox";

type SessionCache = { nickname: string; isAdmin: boolean; userId: string | null };

type LoginResult = { ok: true } | { ok: false; error: string };

type Session = {
  nickname: string | null;
  /** `app_users.id` du porteur connecté, disponible même hors ligne. */
  userId: string | null;
  isAdmin: boolean;
  authenticated: boolean;
  loading: boolean;
  login: (username: string, pin: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<Session | undefined>(undefined);

function deviceLabel(): string | null {
  if (typeof navigator === "undefined") return null;
  return navigator.userAgent.slice(0, 100);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [nickname, setNickname] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (payload: SessionServeur, deja = false) => {
    if (!deja) {
      await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
    }
    localStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({
        nickname: payload.nickname,
        isAdmin: payload.is_admin,
        userId: payload.user_id,
      })
    );
    setNickname(payload.nickname);
    setUserId(payload.user_id);
    setIsAdmin(payload.is_admin);
    setAuthenticated(true);
  }, []);

  useEffect(() => {
    let monte = true;

    async function init() {
      const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
      if (!deviceToken) {
        setLoading(false);
        return;
      }

      const cacheBrut = localStorage.getItem(SESSION_CACHE_KEY);
      const cache: SessionCache | null = cacheBrut ? JSON.parse(cacheBrut) : null;

      // Cache d'abord : la tournée du jour doit s'afficher sans attendre le réseau.
      if (cache) {
        setNickname(cache.nickname);
        setUserId(cache.userId);
        setIsAdmin(cache.isAdmin);
        setAuthenticated(true);
        setLoading(false);
      }

      const session = await rafraichirDepuisAppareil();
      if (!monte) return;
      if (session) {
        await hydrate(session, true);
      } else if (!cache) {
        localStorage.removeItem(DEVICE_TOKEN_KEY);
      }
      setLoading(false);
    }

    init();
    const arreterRejeu = installerRejeuAutomatique();
    return () => {
      monte = false;
      arreterRejeu();
    };
  }, [hydrate]);

  const login = useCallback(
    async (username: string, pin: string): Promise<LoginResult> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, pin, device_label: deviceLabel() }),
        });
        const data = await res.json();
        if (!res.ok) return { ok: false, error: data.error ?? "Erreur de connexion." };
        localStorage.setItem(DEVICE_TOKEN_KEY, data.device_token);
        await hydrate(data);
        return { ok: true };
      } catch {
        return { ok: false, error: "Pas de connexion réseau. Réessaie." };
      }
    },
    [hydrate]
  );

  const logout = useCallback(async () => {
    const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (deviceToken) {
      fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_token: deviceToken }),
      }).catch(() => {});
    }
    localStorage.removeItem(DEVICE_TOKEN_KEY);
    localStorage.removeItem(SESSION_CACHE_KEY);
    await supabase.auth.signOut();
    setNickname(null);
    setUserId(null);
    setIsAdmin(false);
    setAuthenticated(false);
  }, []);

  return (
    <SessionContext.Provider value={{ nickname, userId, isAdmin, authenticated, loading, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
