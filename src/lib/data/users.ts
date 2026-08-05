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

export async function generateCredentials(
  appUserId: string
): Promise<{ access_code: string; pin: string }> {
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
