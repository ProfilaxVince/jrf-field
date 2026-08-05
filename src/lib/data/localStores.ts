"use client";
import { useState, useEffect } from "react";

const KEY = "jrf_stores_v1";

export type SimpleStore = {
  id: string;
  name: string;
  city?: string;
  enseigne?: string;
  region?: string;
  lat?: number | null;
  lng?: number | null;
  jrf_revenue_eur?: number | null;
  active?: boolean;
};

export function useLocalStores() {
  const [stores, setStores] = useState<SimpleStore[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setStores(JSON.parse(raw));
      else {
        setStores([]);
      }
    } catch {
      setStores([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(stores));
    } catch {}
  }, [stores]);

  function upsert(s: SimpleStore) {
    setStores((prev) => {
      const found = prev.find((p) => p.id === s.id);
      if (found) return prev.map((p) => (p.id === s.id ? s : p));
      return [s, ...prev];
    });
  }

  function remove(id: string) {
    setStores((prev) => prev.filter((p) => p.id !== id));
  }

  function importList(list: SimpleStore[]) {
    setStores((prev) => [...list, ...prev]);
  }

  return { stores, upsert, remove, importList };
}
