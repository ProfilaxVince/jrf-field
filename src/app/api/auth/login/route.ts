import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/data/supabaseAdmin";
import {
  LOCK_MINUTES,
  MAX_FAILED_ATTEMPTS,
  createDeviceToken,
  mintSupabaseSession,
  verifySecret,
} from "@/lib/data/authServer";

// Hash factice comparé quand aucun code ne correspond, pour lisser le temps
// de réponse et ne pas laisser deviner l'existence d'un code par timing.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8lF3l9tNQGiHkrVOASxK8pODXfXCvi";

const GENERIC_ERROR = "Code ou PIN incorrect.";

export async function POST(request: Request) {
  let body: { access_code?: unknown; pin?: unknown; device_label?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const accessCode = typeof body.access_code === "string" ? body.access_code.trim().toUpperCase() : "";
  const pin = typeof body.pin === "string" ? body.pin.trim() : "";
  const deviceLabel = typeof body.device_label === "string" ? body.device_label.slice(0, 100) : null;

  if (accessCode.length !== 8 || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  const { data: candidates, error: fetchError } = await admin
    .from("app_users")
    .select(
      "id, nickname, is_admin, active, access_code_hash, pin_hash, auth_user_id, internal_auth_email, failed_login_attempts, locked_until"
    )
    .eq("active", true)
    .not("access_code_hash", "is", null);

  if (fetchError) {
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }

  let matched: (typeof candidates)[number] | null = null;
  for (const candidate of candidates ?? []) {
    if (await verifySecret(accessCode, candidate.access_code_hash)) {
      matched = candidate;
      break;
    }
  }

  if (!matched) {
    // Comparaison factice pour normaliser le temps de réponse.
    await verifySecret(pin, DUMMY_HASH);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (matched.locked_until && new Date(matched.locked_until).getTime() > Date.now()) {
    return NextResponse.json(
      { error: "Compte verrouillé après plusieurs échecs. Réessaie dans quelques minutes." },
      { status: 423 }
    );
  }

  const pinOk = await verifySecret(pin, matched.pin_hash);
  if (!pinOk) {
    const attempts = matched.failed_login_attempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
        : null;
    await admin
      .from("app_users")
      .update({ failed_login_attempts: attempts, locked_until: lockedUntil })
      .eq("id", matched.id);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (!matched.auth_user_id || !matched.internal_auth_email) {
    return NextResponse.json(
      { error: "Compte non provisionné. Demande au responsable de régénérer ton code d'accès." },
      { status: 409 }
    );
  }

  let session;
  try {
    session = await mintSupabaseSession(admin, matched.internal_auth_email);
  } catch {
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }

  const device = await createDeviceToken();
  const { error: insertError } = await admin.from("device_sessions").insert({
    id: device.id,
    user_id: matched.id,
    device_label: deviceLabel,
    refresh_token_hash: device.hash,
  });
  if (insertError) {
    return NextResponse.json({ error: "Erreur serveur, réessaie." }, { status: 500 });
  }

  await admin
    .from("app_users")
    .update({ failed_login_attempts: 0, locked_until: null })
    .eq("id", matched.id);

  return NextResponse.json({
    device_token: device.token,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    // Voir /api/auth/refresh : identifiant applicatif nécessaire hors ligne.
    user_id: matched.id,
    nickname: matched.nickname,
    is_admin: matched.is_admin,
  });
}
