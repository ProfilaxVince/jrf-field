#!/usr/bin/env node
// scripts/link-seed-users.mjs
// Heuristically link rows in `app_users` (seed) to Supabase Auth users.
// Usage: node scripts/link-seed-users.mjs [--apply]

import fs from 'fs';
import readline from 'readline';

function loadEnv(path = '.env.local') {
  try {
    const raw = fs.readFileSync(path, 'utf8');
    const out = {};
    raw.split(/\n/).forEach((ln) => {
      const m = ln.match(/^\s*([^=#\s]+)=(.*)$/);
      if (!m) return;
      out[m[1]] = m[2].replace(/^"|"$/g, '');
    });
    return out;
  } catch {
    // Pas de .env.local : on rend un objet vide, l'appelant demandera les clés.
    return {};
  }
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (ans) => { rl.close(); res(ans); }));
}

(async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const env = loadEnv(process.cwd() + '/.env.local');
  const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  let SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPA_URL) {
    console.error('Could not find NEXT_PUBLIC_SUPABASE_URL in .env.local or env. Aborting.');
    process.exit(1);
  }

  if (!SERVICE_ROLE) {
    SERVICE_ROLE = await prompt('Paste your SUPABASE service_role key (never commit it): ');
    SERVICE_ROLE = SERVICE_ROLE.trim();
    if (!SERVICE_ROLE) {
      console.error('service_role key is required to run this script. Aborting.');
      process.exit(1);
    }
  }

  const headers = {
    Authorization: `Bearer ${SERVICE_ROLE}`,
    apikey: SERVICE_ROLE,
    'Content-Type': 'application/json',
  };

  console.log('Fetching app_users (seed) from DB...');
  const appUsersRes = await fetch(`${SUPA_URL}/rest/v1/app_users?select=id,nickname,full_name,auth_user_id&auth_user_id=is.null`, { headers });
  if (!appUsersRes.ok) {
    console.error('Failed to fetch app_users:', await appUsersRes.text());
    process.exit(1);
  }
  const appUsers = await appUsersRes.json();

  console.log(`Found ${appUsers.length} app_users without auth_user_id.`);

  console.log('Fetching auth users from Admin API (this requires service_role access)...');
  // pull up to 1000 users
  const usersRes = await fetch(`${SUPA_URL}/auth/v1/admin/users?limit=1000`, { headers });
  if (!usersRes.ok) {
    console.error('Failed to fetch auth users:', await usersRes.text());
    process.exit(1);
  }
  const authUsers = await usersRes.json();

  console.log(`Fetched ${authUsers.length} auth users.`);

  const updates = [];

  for (const au of appUsers) {
    const candidates = authUsers.filter((u) => {
      const meta = u.user_metadata || {};
      // Normalize strings
      const fullname = (au.full_name || '').toLowerCase();
      const nick = (au.nickname || '').toLowerCase();

      if (meta.full_name && String(meta.full_name).toLowerCase() === fullname) return true;
      if (meta.name && String(meta.name).toLowerCase() === fullname) return true;
      if (meta.nickname && String(meta.nickname).toLowerCase() === nick) return true;
      if (u.email) {
        const local = String(u.email).split('@')[0].toLowerCase();
        if (local === nick) return true;
      }
      return false;
    });

    if (candidates.length === 1) {
      updates.push({ app_user_id: au.id, auth_user_id: candidates[0].id, match: 'unique' });
    } else if (candidates.length > 1) {
      updates.push({ app_user_id: au.id, auth_user_id: null, match: 'ambiguous', candidates: candidates.map((c) => ({ id: c.id, email: c.email, meta: c.user_metadata })) });
    } else {
      updates.push({ app_user_id: au.id, auth_user_id: null, match: 'none' });
    }
  }

  console.log('Match summary:');
  const uniq = updates.filter((u) => u.match === 'unique').length;
  const amb = updates.filter((u) => u.match === 'ambiguous').length;
  const none = updates.filter((u) => u.match === 'none').length;
  console.log(`  unique: ${uniq}, ambiguous: ${amb}, none: ${none}`);

  if (uniq === 0) {
    console.log('No automatic matches found. Exiting.');
    process.exit(0);
  }

  console.log('\nProposed updates (unique matches):');
  updates.filter((u) => u.match === 'unique').forEach((u) => console.log(`  app_user ${u.app_user_id} -> auth_user ${u.auth_user_id}`));

  if (!apply) {
    console.log('\nDry run. To apply the changes, re-run with `--apply`');
    process.exit(0);
  }

  console.log('\nApplying updates...');
  for (const u of updates.filter((x) => x.match === 'unique')) {
    const body = { auth_user_id: u.auth_user_id };
    const patchRes = await fetch(`${SUPA_URL}/rest/v1/app_users?id=eq.${u.app_user_id}`, {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    if (!patchRes.ok) {
      console.error(`Failed to update app_user ${u.app_user_id}:`, await patchRes.text());
    } else {
      console.log(`Updated app_user ${u.app_user_id}`);
    }
  }

  console.log('Done. Review ambiguous/none matches separately.');
})();
