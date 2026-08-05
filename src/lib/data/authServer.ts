import "server-only";
import { randomBytes, randomInt, randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
const BCRYPT_COST = 10;
// Exclut les caractères ambigus à l'oral/à l'écrit (0/O, 1/I/L).
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function generateAccessCode(): string {
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

export function generatePin(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += randomInt(10).toString();
  return out;
}

export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, BCRYPT_COST);
}

export async function verifySecret(secret: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(secret, hash);
}

/**
 * Génère les éléments d'un token d'appareil opaque `<id>.<secret>` :
 * `id` sert de clé de recherche (non secrète) pour la ligne device_sessions,
 * seul `secret` est vérifié (hashé) — comme un identifiant de clé d'API.
 */
export async function createDeviceToken(): Promise<{ id: string; token: string; hash: string }> {
  const id = randomUUID();
  const secret = randomBytes(32).toString("base64url");
  const hash = await hashSecret(secret);
  return { id, token: `${id}.${secret}`, hash };
}

export function parseDeviceToken(token: string): { id: string; secret: string } | null {
  const idx = token.indexOf(".");
  if (idx <= 0) return null;
  const id = token.slice(0, idx);
  const secret = token.slice(idx + 1);
  if (!id || !secret) return null;
  return { id, secret };
}

export function makeInternalAuthEmail(appUserId: string): string {
  return `${appUserId}@device.jrf-field.internal`;
}

/**
 * Échange une identité app_user contre une vraie session Supabase (pour que
 * auth.uid() résolve côté RLS), sans mot de passe stocké nulle part : on
 * génère un lien magique côté admin puis on le vérifie immédiatement,
 * sans jamais envoyer d'email.
 *
 * IMPORTANT : verifyOtp() authentifie le client qui l'appelle — si on le
 * faisait sur `admin`, ses requêtes .from() suivantes basculeraient de
 * service_role vers la session fraîchement créée (perte du bypass RLS).
 * On isole donc verifyOtp() sur un client jetable, `admin` reste intact.
 */
export async function mintSupabaseSession(
  admin: SupabaseClient<Database>,
  internalAuthEmail: string
): Promise<Session> {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: internalAuthEmail,
  });
  if (linkError || !linkData) {
    throw new Error(`generateLink failed: ${linkError?.message ?? "unknown"}`);
  }
  const hashedToken = linkData.properties?.hashed_token;
  if (!hashedToken) throw new Error("generateLink did not return hashed_token");

  const verifier = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: verifyData, error: verifyError } = await verifier.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashedToken,
  });
  if (verifyError || !verifyData.session) {
    throw new Error(`verifyOtp failed: ${verifyError?.message ?? "no session"}`);
  }
  return verifyData.session;
}

/** Résout l'app_user admin à l'origine d'une requête à partir de son Bearer token. */
export async function requireAdminCaller(
  admin: SupabaseClient<Database>,
  request: Request
): Promise<{ id: string } | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return null;

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return null;

  const { data: appUser } = await admin
    .from("app_users")
    .select("id, is_admin, active")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (!appUser || !appUser.active || !appUser.is_admin) return null;
  return { id: appUser.id };
}
