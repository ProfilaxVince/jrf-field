/**
 * Supabase client factory for the frontend.
 * Expects the following env vars to be set in `.env.local`:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export function createSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment"
    );
  }

  return createClient<Database>(url, anonKey, {
    auth: { persistSession: false },
  });
}

export const supabase = (() => {
  try {
    return createSupabaseClient();
  } catch {
    // In dev without env vars, allow imports but throw when used.
    return null as unknown as SupabaseClient<Database>;
  }
})();
