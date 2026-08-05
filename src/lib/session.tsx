"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./data/supabase";
import type { Database } from "./data/database.types";
import type { User } from "@supabase/supabase-js";

type AppUser = Database["public"]["Tables"]["app_users"]["Row"] | null;

type Session = {
  authUser: User | null;
  appUser: AppUser;
  loading: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      if (!mounted) return;
      setAuthUser(user);
      if (user) {
        const { data } = await supabase.from("app_users").select("*").eq("auth_user_id", user.id).single();
        if (!mounted) return;
        setAppUser(data ?? null);
      } else {
        setAppUser(null);
      }
      setLoading(false);
    }

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      if (user) {
        const { data } = await supabase.from("app_users").select("*").eq("auth_user_id", user.id).single();
        setAppUser(data ?? null);
      } else {
        setAppUser(null);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  async function signInWithEmail(email: string) {
    await supabase.auth.signInWithOtp({ email });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <SessionContext.Provider value={{ authUser, appUser, loading, signInWithEmail, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
