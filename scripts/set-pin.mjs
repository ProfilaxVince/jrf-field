#!/usr/bin/env node
// Attribue un code à 4 chiffres à un membre de l'équipe, et provisionne son
// compte auth interne s'il n'existe pas encore.
//
// Sert à deux choses :
//   · sortir du problème de l'œuf et la poule (donner un code nécessite
//     normalement d'être déjà connecté en admin) ;
//   · imposer un code choisi plutôt qu'un code tiré au hasard.
//
// À exécuter EN LOCAL, avec le service_role dans .env.local.
// Jamais via l'application, jamais en CI, jamais dans un fichier commité :
// le code en clair ne doit exister que dans la ligne de commande de l'admin.
//
// Usage:
//   node scripts/set-pin.mjs "Gerardo" 1969   -> code choisi
//   node scripts/set-pin.mjs "Tony"           -> code tiré au hasard, affiché

import fs from "fs";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const PIN_LENGTH = 4;

function loadEnv(path = ".env.local") {
  const out = {};
  try {
    const raw = fs.readFileSync(path, "utf8");
    raw.split(/\n/).forEach((ln) => {
      const m = ln.match(/^\s*([^=#\s]+)=(.*)$/);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "");
    });
  } catch {
    // Pas de .env.local : les valeurs viendront de l'environnement.
  }
  return out;
}

function randomPin() {
  let out = "";
  for (let i = 0; i < PIN_LENGTH; i++) out += crypto.randomInt(10);
  return out;
}

async function main() {
  const username = process.argv[2];
  const pinArg = process.argv[3];

  if (!username) {
    console.error('Usage: node scripts/set-pin.mjs "<nom d\'utilisateur>" [code4chiffres]');
    process.exit(1);
  }
  if (pinArg !== undefined && !new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pinArg)) {
    console.error(`Le code doit faire exactement ${PIN_LENGTH} chiffres.`);
    process.exit(1);
  }

  const env = { ...loadEnv(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (dans .env.local ou l'environnement)."
    );
    process.exit(1);
  }

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Le nom d'utilisateur est le surnom, comparé sans tenir compte de la casse.
  const { data: candidates, error: fetchError } = await admin
    .from("app_users")
    .select("id, nickname, active, auth_user_id, internal_auth_email")
    .eq("active", true);
  if (fetchError) {
    console.error("Lecture impossible:", fetchError.message);
    process.exit(1);
  }

  const cible = (candidates ?? []).find(
    (c) => c.nickname.trim().toLowerCase() === username.trim().toLowerCase()
  );
  if (!cible) {
    console.error(
      `Utilisateur actif "${username}" introuvable. Noms disponibles : ${(candidates ?? [])
        .map((c) => c.nickname)
        .join(", ")}`
    );
    process.exit(1);
  }

  let authUserId = cible.auth_user_id;
  let internalAuthEmail = cible.internal_auth_email;
  if (!authUserId) {
    internalAuthEmail = `${cible.id}@device.jrf-field.internal`;
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: internalAuthEmail,
      email_confirm: true,
      user_metadata: { app_user_id: cible.id },
    });
    if (createError || !created.user) {
      console.error("Échec de création du compte auth interne:", createError?.message);
      process.exit(1);
    }
    authUserId = created.user.id;
  }

  const pin = pinArg ?? randomPin();
  const pinHash = await bcrypt.hash(pin, 10);

  const { error: updateError } = await admin
    .from("app_users")
    .update({
      auth_user_id: authUserId,
      internal_auth_email: internalAuthEmail,
      pin_hash: pinHash,
      access_code_hash: null, // obsolète depuis le passage au nom d'utilisateur
      failed_login_attempts: 0,
      locked_until: null,
    })
    .eq("id", cible.id);
  if (updateError) {
    console.error("Échec de mise à jour:", updateError.message);
    process.exit(1);
  }

  // Un nouveau code invalide les appareils déjà appairés.
  await admin
    .from("device_sessions")
    .update({ revoked: true })
    .eq("user_id", cible.id)
    .eq("revoked", false);

  console.log(`\nConnexion prête pour ${cible.nickname} :`);
  console.log(`  Nom d'utilisateur : ${cible.nickname}`);
  console.log(`  Code              : ${pin}`);
  console.log("\nLe code n'est stocké que hashé. Il ne sera plus jamais affiché.\n");
}

main();
