"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "./data/supabase";

const DEVICE_TOKEN_KEY = "jrf_device_token";
const SESSION_CACHE_KEY = "jrf_session_cache";

type SessionCache = { nickname: string; isAdmin: boolean };

type ServerSessionPayload = {
  access_token: string;
  refresh_token: string;
  nickname: string;
  is_admin: boolean;
};

type LoginResult = { ok: true } | { ok: false; error: string };

type Session = {
  nickname: string | null;
  isAdmin: boolean;
  authenticated: boolean;
  loading: boolean;
  login: (accessCode: string, pin: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<Session | undefined>(undefined);

function deviceLabel(): string | null {
  if (typeof navigator === "undefined") return null;
  return navigator.userAgent.slice(0, 100);
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [nickname, setNickname] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const hydrate = useCallback(async (payload: ServerSessionPayload) => {
    await supabase.auth.setSession({
      access_token: payload.access_token,
      refresh_token: payload.refresh_token,
    });
    localStorage.setItem(
      SESSION_CACHE_KEY,
      JSON.stringify({ nickname: payload.nickname, isAdmin: payload.is_admin })
    );
    setNickname(payload.nickname);
    setIsAdmin(payload.is_admin);
    setAuthenticated(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const deviceToken = localStorage.getItem(DEVICE_TOKEN_KEY);
      if (!deviceToken) {
        setLoading(false);
        return;
      }

      const cachedRaw = localStorage.getItem(SESSION_CACHE_KEY);
      const cached: SessionCache | null = cachedRaw ? JSON.parse(cachedRaw) : null;

      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_token: deviceToken }),
        });
        if (!mounted) return;
        if (!res.ok) {
          localStorage.removeItem(DEVICE_TOKEN_KEY);
          localStorage.removeItem(SESSION_CACHE_KEY);
          setLoading(false);
          return;
        }
        const data = await res.json();
        await hydrate(data);
      } catch {
        // Pas de réseau au démarrage : on reste optimiste sur les infos
        // en cache pour ne pas bloquer l'accès aux données déjà en cache local
        // (règle "cache avant réseau"). L'écriture restera bloquée par RLS
        // tant qu'une vraie session n'a pas été obtenue.
        if (mounted && cached) {
          setNickname(cached.nickname);
          setIsAdmin(cached.isAdmin);
          setAuthenticated(true);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [hydrate]);

  const login = useCallback(
    async (accessCode: string, pin: string): Promise<LoginResult> => {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_code: accessCode, pin, device_label: deviceLabel() }),
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
    setIsAdmin(false);
    setAuthenticated(false);
  }, []);

  return (
    <SessionContext.Provider value={{ nickname, isAdmin, authenticated, loading, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
