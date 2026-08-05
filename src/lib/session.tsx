"use client";
import { createContext, useContext, useState } from "react";
import { seedUsers, type SeedUser } from "./data/seedUsers";

type Session = {
  user: SeedUser | null;
  loginAs: (id: string) => void;
  logout: () => void;
};

const SessionContext = createContext<Session | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("jrf_user") || null;
    } catch {
      return null;
    }
  });

  const user = seedUsers.find((u) => u.id === userId) ?? null;

  function loginAs(id: string) {
    setUserId(id);
    try {
      localStorage.setItem("jrf_user", id);
    } catch {}
  }

  function logout() {
    setUserId(null);
    try {
      localStorage.removeItem("jrf_user");
    } catch {}
  }

  return (
    <SessionContext.Provider value={{ user, loginAs, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
