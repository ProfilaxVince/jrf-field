#!/usr/bin/env node
// Bootstrap : génère le premier code d'accès + PIN d'un admin, pour sortir
// du problème de l'œuf et la poule (générer un code nécessite normalement
// d'être déjà connecté en admin). À exécuter une fois, en local, avec le
// service_role dans .env.local — jamais via l'app, jamais en CI.
//
// Usage: node scripts/bootstrap-admin-credentials.mjs "Gerardo"

import fs from "fs";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path = ".env.local") {
  const out = {};
  try {
    const raw = fs.readFileSync(path, "utf8");
    raw.split(/\n/).forEach((ln) => {
      const m = ln.match(/^\s*([^=#\s]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
    });
  } catch {}
  return out;
}

const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function generateAccessCode() {
  let out = "";
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}
function generatePin() {
  let out = "";
  for (let i = 0; i < 6; i++) out += Math.floor(Math.random() * 10);
  return out;
}

async function main() {
  const nickname = process.argv[2] || "Gerardo";
  const env = { ...loadEnv(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (dans .env.local ou l'environnement).");
    process.exit(1);
  }

  const admin = createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: target, error: fetchError } = await admin
    .from("app_users")
    .select("id, nickname, active, auth_user_id, internal_auth_email")
    .eq("nickname", nickname)
    .eq("active", true)
    .maybeSingle();
  if (fetchError || !target) {
    console.error(`Utilisateur actif "${nickname}" introuvable.`, fetchError?.message ?? "");
    process.exit(1);
  }

  let authUserId = target.auth_user_id;
  let internalAuthEmail = target.internal_auth_email;
  if (!authUserId) {
    internalAuthEmail = `${target.id}@device.jrf-field.internal`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: internalAuthEmail,
      email_confirm: true,
      user_metadata: { app_user_id: target.id },
    });
    if (createError || !created.user) {
      console.error("Échec de création du compte auth interne:", createError?.message);
      process.exit(1);
    }
    authUserId = created.user.id;
  }

  const accessCode = generateAccessCode();
  const pin = generatePin();
  const [accessCodeHash, pinHash] = await Promise.all([bcrypt.hash(accessCode, 10), bcrypt.hash(pin, 10)]);

  const { error: updateError } = await admin
    .from("app_users")
    .update({
      auth_user_id: authUserId,
      internal_auth_email: internalAuthEmail,
      access_code_hash: accessCodeHash,
      pin_hash: pinHash,
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq("id", target.id);
  if (updateError) {
    console.error("Échec de mise à jour:", updateError.message);
    process.exit(1);
  }

  console.log(`\nIdentifiants générés pour ${nickname} — à noter, ne seront plus affichés :`);
  console.log(`  Code d'accès : ${accessCode}`);
  console.log(`  PIN          : ${pin}\n`);
}

main();
