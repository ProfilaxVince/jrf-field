import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/data/supabaseAdmin";
import { mintSupabaseSession, parseDeviceToken, verifySecret } from "@/lib/data/authServer";

const GENERIC_ERROR = "Session expirée, reconnecte-toi.";

export async function POST(request: Request) {
  let body: { device_token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const deviceToken = typeof body.device_token === "string" ? body.device_token : "";
  const parsed = parseDeviceToken(deviceToken);
  if (!parsed) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: deviceSession } = await admin
    .from("device_sessions")
    .select("id, user_id, refresh_token_hash, revoked")
    .eq("id", parsed.id)
    .maybeSingle();

  if (!deviceSession || deviceSession.revoked) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const secretOk = await verifySecret(parsed.secret, deviceSession.refresh_token_hash);
  if (!secretOk) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const { data: appUser } = await admin
    .from("app_users")
    .select("id, nickname, is_admin, active, auth_user_id, internal_auth_email")
    .eq("id", deviceSession.user_id)
    .maybeSingle();

  if (!appUser || !appUser.active || !appUser.internal_auth_email) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  let session;
  try {
    session = await mintSupabaseSession(admin, appUser.internal_auth_email);
  } catch {
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }

  await admin
    .from("device_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", deviceSession.id);

  return NextResponse.json({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    // Identifiant applicatif : le portail commercial en a besoin HORS LIGNE
    // (auteur d'un signalement). Ce n'est pas un secret — RLS ne s'appuie pas
    // dessus, elle résout l'utilisateur côté serveur via auth.uid().
    user_id: appUser.id,
    nickname: appUser.nickname,
    is_admin: appUser.is_admin,
  });
}
