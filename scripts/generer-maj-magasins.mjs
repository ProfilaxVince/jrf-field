#!/usr/bin/env node
/**
 * Écrit `supabase/manual/mettre-a-jour-magasins.sql` : le script à coller dans
 * le SQL Editor pour répercuter le travail d'adresses sur les magasins DÉJÀ EN
 * BASE.
 *
 * Pourquoi une mise à jour et pas un import : le fichier de 185 lignes a été
 * importé le 06/08/2026. `stores.external_ref` étant UNIQUE, réimporter est
 * impossible — et serait de toute façon faux, puisqu'il faudrait alors gérer
 * 182 doublons. La clé de jointure est la référence, désormais figée dans
 * `references-magasins.json`.
 *
 * Seules les lignes qui CHANGENT sont écrites. L'état actuel de la base est
 * connu : c'est le CSV tel qu'il a été importé, que git conserve. Écrire les
 * 182 lignes marcherait aussi (la clause `is distinct from` les rendrait
 * inoffensives) mais donnerait un script de 285 lignes à recopier sur un
 * téléphone, où chaque ligne inutile est une occasion de se tromper.
 *
 * Le SQL produit reste idempotent : le relancer ne change rien de plus.
 *
 * Usage : node scripts/generer-maj-magasins.mjs [csv-tel-qu-importe]
 */

import fs from "fs";
import { execFileSync } from "child_process";
import { REFERENCES_ECARTEES } from "./magasins-source.mjs";
import { decouper } from "./magasins-csv.mjs";

const ENTREE = "supabase/manual/magasins-reels.csv";
const SORTIE = "supabase/manual/mettre-a-jour-magasins.sql";
/** Le CSV tel qu'il a été importé en base, relu depuis l'historique git. */
const COMMIT_IMPORT = process.argv[2] ?? "011b7e1";

const ENSEIGNE_SQL = {
  "Intermarché": "intermarche",
  "AD Delhaize": "ad_delhaize",
  "Proxy Delhaize": "proxy_delhaize",
  "Delhaize": "delhaize",
  "Spar": "spar",
};

const guillemets = (v) => (v ? `'${String(v).replace(/'/g, "''")}'` : "null");

function lire(texte) {
  const lignes = texte.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.length > 0);
  const colonnes = decouper(lignes[0]);
  const idx = Object.fromEntries(colonnes.map((c, i) => [c, i]));
  const par = new Map();
  for (const ligne of lignes.slice(1)) {
    const c = decouper(ligne);
    const enseigne = ENSEIGNE_SQL[c[idx.enseigne]];
    if (!enseigne) throw new Error(`Enseigne inconnue : « ${c[idx.enseigne]} »`);
    if (par.has(c[idx.reference])) continue;
    par.set(c[idx.reference], {
      reference: c[idx.reference],
      nom: c[idx.nom],
      adresse: c[idx.adresse],
      code_postal: c[idx.code_postal],
      ville: c[idx.ville],
      region: c[idx.region],
      enseigne,
      network: c[idx.reseau],
      libelle: c[idx.libelle_excel],
    });
  }
  return par;
}

const cible = lire(fs.readFileSync(ENTREE, "utf8"));
const enBase = lire(
  execFileSync("git", ["show", `${COMMIT_IMPORT}:${ENTREE}`], { encoding: "utf8", maxBuffer: 32e6 })
);

const CHAMPS = ["nom", "adresse", "code_postal", "ville", "region", "enseigne", "network"];
const changees = [...cible.values()].filter((m) => {
  const avant = enBase.get(m.reference);
  return !avant || CHAMPS.some((c) => avant[c] !== m[c]);
});

const valeurs = changees.map(
  (m) =>
    `    (${guillemets(m.reference)}, ${guillemets(m.nom)}, ${guillemets(m.adresse)}, ` +
    `${guillemets(m.code_postal)}, ${guillemets(m.ville)}, '${m.region}'::region_type, ` +
    `'${m.enseigne}'::enseigne, ${m.network ? `'${m.network}'::network_type` : "null"})`
);

const ecartees = REFERENCES_ECARTEES.map((e) => `--   ${e.reference}  ${e.libelle} — ${e.raison}`).join("\n");
const refsEcartees = REFERENCES_ECARTEES.map((e) => `'${e.reference}'`).join(", ");

const sql = `-- ============================================================
-- METTRE À JOUR LES MAGASINS DÉJÀ EN BASE
-- Généré par scripts/generer-maj-magasins.mjs — ne pas éditer à la main.
--
-- À coller d'un seul bloc dans le SQL Editor de Supabase.
-- Transactionnel et idempotent : le relancer ne change rien de plus.
-- Aucune suppression physique — les doublons passent en active = false.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Les ${valeurs.length} magasins dont une information a changé depuis l'import
--    (adresse retrouvée, commune corrigée, enseigne rétablie).
--    Les ${cible.size - valeurs.length} autres sont déjà justes en base : rien à écrire.
-- ------------------------------------------------------------
update stores as s
   set name = v.nom, address = v.adresse, postal_code = v.code_postal,
       city = v.ville, region = v.region, enseigne = v.enseigne,
       network = v.network, updated_at = now()
  from (values
${valeurs.join(",\n")}
  ) as v (reference, nom, adresse, code_postal, ville, region, enseigne, network)
 where s.external_ref = v.reference
   and (s.name is distinct from v.nom or s.address is distinct from v.adresse
     or s.postal_code is distinct from v.code_postal or s.city is distinct from v.ville
     or s.region is distinct from v.region or s.enseigne is distinct from v.enseigne
     or s.network is distinct from v.network);

-- ------------------------------------------------------------
-- 2. Les trois doublons du fichier source : deux lignes, un seul magasin.
--    Le second exemplaire n'est jamais visité, donc sa dette monte
--    indéfiniment et il finit en tête des priorités — ce que le produit
--    est précisément censé empêcher.
${ecartees}
-- ------------------------------------------------------------
update visits
   set active = false, motif_annulation = 'doublon du fichier source retiré'
 where active
   and store_id in (select id from stores where external_ref in (${refsEcartees}));

delete from routing_template_stops
 where store_id in (select id from stores where external_ref in (${refsEcartees}));

-- La référence est libérée pour ne pas bloquer un futur import.
update stores
   set active = false, name = name || ' (doublon retiré)',
       external_ref = null, updated_at = now()
 where active and external_ref in (${refsEcartees});

commit;

-- ============================================================
-- VÉRIFICATION — attendu : sans_adresse = 2 (Waterloo et Wavre, en attente
-- de Gérardo), intermarche = 95, ad_delhaize = 80, proxy = 5,
-- delhaize_integres = 1, spar = 1.
-- ============================================================
select
  count(*) filter (where active)                                  as magasins_actifs,
  count(*) filter (where active and address is null)              as sans_adresse,
  count(*) filter (where not active and external_ref is not null) as desactives_hors_doublons,
  count(*) filter (where active and enseigne = 'intermarche')     as intermarche,
  count(*) filter (where active and enseigne = 'ad_delhaize')     as ad_delhaize,
  count(*) filter (where active and enseigne = 'proxy_delhaize')  as proxy,
  count(*) filter (where active and enseigne = 'delhaize')        as delhaize_integres,
  count(*) filter (where active and enseigne = 'spar')            as spar
from stores;

-- Désactivés sans être des doublons ? (0 ligne = tout va bien)
select external_ref, name, city from stores
where not active and external_ref is not null order by external_ref;
`;

fs.writeFileSync(SORTIE, sql);
console.log(`\n${valeurs.length} magasins à corriger sur ${cible.size} (${cible.size - valeurs.length} déjà justes)`);
console.log(`${REFERENCES_ECARTEES.length} doublons désactivés → ${SORTIE}\n`);
