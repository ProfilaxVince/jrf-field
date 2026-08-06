import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/data/supabaseAdmin";
import {
  generatePin,
  hashSecret,
  makeInternalAuthEmail,
  requireAdminCaller,
} from "@/lib/data/authServer";

/**
 * Génère (ou régénère) le PIN d'un app_user. Réservé à l'admin.
 * Le nom d'utilisateur, lui, est le surnom : il est déjà connu de tous,
 * seul le PIN est un secret. Il n'est jamais stocké en clair et n'est
 * renvoyé qu'une seule fois dans cette réponse — l'admin le communique
 * de vive voix au commercial concerné.
 */
export async function POST(request: Request) {
  const admin = createSupabaseAdminClient();
  const caller = await requireAdminCaller(admin, request);
  if (!caller) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  let body: { app_user_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const targetId = typeof body.app_user_id === "string" ? body.app_user_id : "";
  if (!targetId) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { data: target, error: targetError } = await admin
    .from("app_users")
    .select("id, active, auth_user_id, internal_auth_email")
    .eq("id", targetId)
    .maybeSingle();
  if (targetError || !target || !target.active) {
    return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  }

  let authUserId = target.auth_user_id;
  let internalAuthEmail = target.internal_auth_email;

  if (!authUserId) {
    internalAuthEmail = makeInternalAuthEmail(target.id);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: internalAuthEmail,
      email_confirm: true,
      user_metadata: { app_user_id: target.id },
    });
    if (createError || !created.user) {
      return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
    }
    authUserId = created.user.id;
  }

  const pin = generatePin();
  const pinHash = await hashSecret(pin);

  const { error: updateError } = await admin
    .from("app_users")
    .update({
      auth_user_id: authUserId,
      internal_auth_email: internalAuthEmail,
      pin_hash: pinHash,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq("id", target.id);
  if (updateError) {
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }

  // Nouveau PIN → les anciens appareils ne doivent plus pouvoir se rafraîchir.
  await admin.from("device_sessions").update({ revoked: true }).eq("user_id", target.id).eq("revoked", false);

  return NextResponse.json({ pin });
}
