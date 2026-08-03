/**
 * Génère supabase/seed.sql : 6 utilisateurs + 185 magasins FICTIFS
 * respectant la distribution réelle du parc JRF (enseignes × régions).
 * ⚠️ Données de magasins fictives : à remplacer par l'import du
 * magasins_seed.csv réel (Lot 1). Signalé conformément aux interdits du brief.
 * Déterministe (seed PRNG fixe) pour un seed.sql stable en git.
 */

// PRNG déterministe (mulberry32)
let s = 20260802;
const rand = () => {
  s |= 0; s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const jitter = (v, amp) => +(v + (rand() - 0.5) * amp).toFixed(5);

// Villes { name, cp, lat, lng, region }
const WAL = [
  ["Jumet", "6040", 50.443, 4.437], ["Charleroi", "6000", 50.411, 4.444],
  ["Gosselies", "6041", 50.467, 4.428], ["Fleurus", "6220", 50.483, 4.55],
  ["Gerpinnes", "6280", 50.338, 4.526], ["Thuin", "6530", 50.34, 4.286],
  ["Binche", "7130", 50.412, 4.165], ["La Louvière", "7100", 50.48, 4.188],
  ["Mons", "7000", 50.454, 3.952], ["Soignies", "7060", 50.579, 4.071],
  ["Nivelles", "1400", 50.598, 4.328], ["Wavre", "1300", 50.717, 4.601],
  ["Ottignies", "1340", 50.665, 4.567], ["Gembloux", "5030", 50.561, 4.699],
  ["Namur", "5000", 50.467, 4.867], ["Andenne", "5300", 50.489, 5.096],
  ["Ciney", "5590", 50.294, 5.1], ["Dinant", "5500", 50.261, 4.912],
  ["Philippeville", "5600", 50.196, 4.544], ["Couvin", "5660", 50.052, 4.495],
  ["Chimay", "6460", 50.048, 4.317], ["Beaumont", "6500", 50.237, 4.239],
  ["Liège", "4000", 50.633, 5.567], ["Seraing", "4100", 50.583, 5.5],
  ["Huy", "4500", 50.519, 5.24], ["Waremme", "4300", 50.698, 5.255],
  ["Verviers", "4800", 50.589, 5.863], ["Marche-en-Famenne", "6900", 50.227, 5.344],
  ["Bastogne", "6600", 50.004, 5.72], ["Arlon", "6700", 49.683, 5.816],
  ["Libramont", "6800", 49.92, 5.379], ["Tournai", "7500", 50.607, 3.389],
  ["Ath", "7800", 50.629, 3.778], ["Mouscron", "7700", 50.744, 3.206],
  ["Braine-le-Comte", "7090", 50.609, 4.144], ["Tubize", "1480", 50.69, 4.201],
].map(([name, cp, lat, lng]) => ({ name, cp, lat, lng, region: "wallonie" }));

const BXL = [
  ["Bruxelles", "1000", 50.847, 4.352], ["Schaerbeek", "1030", 50.867, 4.377],
  ["Ixelles", "1050", 50.822, 4.372], ["Anderlecht", "1070", 50.836, 4.312],
  ["Uccle", "1180", 50.802, 4.337], ["Woluwe-Saint-Lambert", "1200", 50.847, 4.428],
  ["Jette", "1090", 50.877, 4.326], ["Forest", "1190", 50.809, 4.317],
].map(([name, cp, lat, lng]) => ({ name, cp, lat, lng, region: "bruxelles" }));

const VLA = [
  ["Gent", "9000", 51.054, 3.717], ["Oudenaarde", "9700", 50.845, 3.609],
  ["Torhout", "8820", 51.066, 3.1], ["Waregem", "8790", 50.889, 3.427],
  ["Diksmuide", "8600", 51.033, 2.865], ["Zedelgem", "8210", 51.141, 3.135],
  ["Aartselaar", "2630", 51.134, 4.387], ["Schoten", "2900", 51.253, 4.5],
  ["Kortrijk", "8500", 50.828, 3.265], ["Aalst", "9300", 50.937, 4.04],
].map(([name, cp, lat, lng]) => ({ name, cp, lat, lng, region: "flandre" }));

// Distribution exacte du brief : enseigne/réseau × répartition régionale 140/20/25
const groups = [
  { n: 41, enseigne: "intermarche", network: "by_mestdagh", label: "Intermarché" },
  { n: 54, enseigne: "intermarche", network: "independant", label: "Intermarché" },
  { n: 78, enseigne: "ad_delhaize", network: "affilie", label: "AD Delhaize" },
  { n: 5, enseigne: "proxy_delhaize", network: "affilie", label: "Proxy Delhaize" },
  { n: 6, enseigne: "delhaize", network: "integre", label: "Delhaize" },
  { n: 1, enseigne: "spar", network: null, label: "Spar" },
];

// Répartition régionale : Intermarché quasi exclusivement wallon (réalité BY/ex-Mestdagh),
// la Flandre portée par AD Delhaize, Bruxelles mixte.
const regionPlan = { wallonie: 140, bruxelles: 20, flandre: 25 };
const rows = [];
let counter = 0;

for (const g of groups) {
  for (let i = 0; i < g.n; i++) {
    counter++;
    let region;
    if (g.enseigne === "intermarche") region = rand() < 0.92 ? "wallonie" : "bruxelles";
    else if (g.enseigne === "spar") region = "wallonie";
    else region = null; // affecté ensuite pour équilibrer
    rows.push({ ...g, region, idx: counter });
  }
}
// Équilibrage : remplir les quotas régionaux restants avec les magasins Delhaize/AD
const count = (r) => rows.filter((x) => x.region === r).length;
for (const row of rows.filter((x) => x.region === null)) {
  if (count("flandre") < regionPlan.flandre) row.region = "flandre";
  else if (count("bruxelles") < regionPlan.bruxelles) row.region = "bruxelles";
  else row.region = "wallonie";
}

const streets = ["Rue de la Station", "Chaussée de Bruxelles", "Grand-Rue", "Rue du Commerce", "Avenue des Alliés", "Rue Neuve", "Chaussée de Charleroi", "Rue de la Gare", "Place du Marché", "Rue Saint-Roch"];
const straatjes = ["Stationsstraat", "Kerkstraat", "Marktplein", "Nieuwstraat", "Brugsesteenweg"];

// CA annuel : distribution log-normale grossière (min 40 k€, max ~600 k€)
const revenue = () => Math.round((40000 + Math.pow(rand(), 2.2) * 560000) / 1000) * 1000;

const esc = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

const values = rows.map((r) => {
  const pool = r.region === "wallonie" ? WAL : r.region === "bruxelles" ? BXL : VLA;
  const city = pick(pool);
  const street = r.region === "flandre" ? pick(straatjes) : pick(streets);
  const num = 1 + Math.floor(rand() * 120);
  const langue = r.region === "flandre" ? "nl" : r.region === "bruxelles" && rand() < 0.2 ? "nl" : "fr";
  return `(${esc(`FICTIF-${String(r.idx).padStart(3, "0")}`)}, ${esc(`${r.label} ${city.name}`)}, '${r.enseigne}', ${r.network ? `'${r.network}'` : "null"}, ${esc(`${street} ${num}`)}, ${esc(city.cp)}, ${esc(city.name)}, '${r.region}', ${jitter(city.lat, 0.02)}, ${jitter(city.lng, 0.03)}, '${langue}', ${revenue()})`;
});

const sql = `-- ============================================================
-- SEED JRF Field — DONNÉES DE MAGASINS FICTIVES (généré par scripts/generate-seed.mjs)
-- ⚠️ 185 magasins fictifs respectant la distribution réelle du parc
-- (41 ITM BY + 54 ITM indé + 78 AD Delhaize + 5 Proxy + 6 Delhaize + 1 Spar ;
--  140 Wallonie / 20 Bruxelles / 25 Flandre).
-- À remplacer par l'import de magasins_seed.csv réel au Lot 1.
-- ============================================================

-- ---------- Équipe (source : outil Excel actuel, surnoms et couleurs à l'identique) ----------
-- access_code_hash / pin_hash : null au seed. Générés par l'admin au Lot 1 ;
-- JAMAIS de code en clair en base, en seed ou en logs.
insert into app_users (full_name, nickname, color_hex, is_admin) values
  ('Petrosino Gérardo', 'Gerardo', '#FFFF00', true),
  ('Martella Giulio', 'Guilio', '#92D050', false),   -- orthographe de l'Excel, conservée
  ('Carion Page', 'Page', '#00B0F0', false),
  ('Claessens Michel', 'Michou', '#FF0000', false),
  ('Vanderskippen Tony', 'Tony', '#FFC000', false),
  ('Martella Laura', 'Laura', '#7030A0', false);

-- ---------- 185 magasins fictifs ----------
insert into stores (external_ref, name, enseigne, network, address, postal_code, city, region, lat, lng, contact_lang, jrf_revenue_eur, jrf_revenue_year) values
${values.join(",\n")};
`;

import { writeFileSync } from "node:fs";
writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
console.log(`seed.sql généré : ${rows.length} magasins`);
console.log("Répartition régions :", { wallonie: count("wallonie"), bruxelles: count("bruxelles"), flandre: count("flandre") });
