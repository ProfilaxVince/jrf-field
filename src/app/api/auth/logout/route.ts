import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/data/supabaseAdmin";
import { parseDeviceToken, verifySecret } from "@/lib/data/authServer";

export async function POST(request: Request) {
  let body: { device_token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const deviceToken = typeof body.device_token === "string" ? body.device_token : "";
  const parsed = parseDeviceToken(deviceToken);
  if (!parsed) return NextResponse.json({ ok: true });

  const admin = createSupabaseAdminClient();
  const { data: deviceSession } = await admin
    .from("device_sessions")
    .select("id, refresh_token_hash")
    .eq("id", parsed.id)
    .maybeSingle();

  if (deviceSession && (await verifySecret(parsed.secret, deviceSession.refresh_token_hash))) {
    await admin.from("device_sessions").update({ revoked: true }).eq("id", deviceSession.id);
  }

  return NextResponse.json({ ok: true });
}
