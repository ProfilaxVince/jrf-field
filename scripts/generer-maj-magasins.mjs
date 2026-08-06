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
 * Le SQL produit est idempotent : le relancer ne change rien de plus.
 *
 * Usage : node scripts/generer-maj-magasins.mjs
 */

import fs from "fs";
import { REFERENCES_ECARTEES } from "./magasins-source.mjs";
import { decouper } from "./magasins-csv.mjs";

const ENTREE = "supabase/manual/magasins-reels.csv";
const SORTIE = "supabase/manual/mettre-a-jour-magasins.sql";

/** Mêmes valeurs que `reconnaitreEnseigne` / `reconnaitreReseau` de l'écran d'import. */
const ENSEIGNE_SQL = {
  "Intermarché": "intermarche",
  "AD Delhaize": "ad_delhaize",
  "Proxy Delhaize": "proxy_delhaize",
  "Delhaize": "delhaize",
  "Spar": "spar",
};

const guillemets = (v) => (v ? `'${String(v).replace(/'/g, "''")}'` : "null");

const lignes = fs
  .readFileSync(ENTREE, "utf8")
  .replace(/^﻿/, "")
  .split(/\r?\n/)
  .filter((l) => l.length > 0);
const colonnes = decouper(lignes[0]);
const idx = Object.fromEntries(colonnes.map((c, i) => [c, i]));

const valeurs = lignes.slice(1).map((ligne) => {
  const c = decouper(ligne);
  const enseigne = ENSEIGNE_SQL[c[idx.enseigne]];
  if (!enseigne) throw new Error(`Enseigne inconnue : « ${c[idx.enseigne]} »`);
  return (
    `    (${guillemets(c[idx.reference])}, ${guillemets(c[idx.nom])}, ` +
    `${guillemets(c[idx.adresse])}, ${guillemets(c[idx.code_postal])}, ` +
    `${guillemets(c[idx.ville])}, '${c[idx.region]}'::region_type, ` +
    `'${enseigne}'::enseigne, ${c[idx.reseau] ? `'${c[idx.reseau]}'::network_type` : "null"})`
  );
});

const ecartees = REFERENCES_ECARTEES.map(
  (e) => `  -- ${e.reference}  ${e.libelle} — ${e.raison}`
).join("\n");
const refsEcartees = REFERENCES_ECARTEES.map((e) => `'${e.reference}'`).join(", ");

const sql = `-- ============================================================
-- METTRE À JOUR LES MAGASINS DÉJÀ EN BASE
--
-- Généré par scripts/generer-maj-magasins.mjs — ne pas éditer à la main.
-- À coller dans le SQL Editor de Supabase, d'un seul bloc.
--
-- Pourquoi ceci et pas un import : les 185 lignes ont été importées le
-- 06/08/2026. \`stores.external_ref\` est UNIQUE, donc réimporter est
-- impossible. Ce script écrit les adresses retrouvées depuis, les communes
-- corrigées et les enseignes rétablies, sur les lignes existantes.
--
-- Il est idempotent : le relancer ne change rien de plus.
-- Aucune suppression physique : les doublons passent en \`active = false\`.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Les ${valeurs.length} magasins réels : adresse, commune, enseigne, réseau, nom.
--    La jointure se fait sur external_ref, figée dans
--    scripts/references-magasins.json.
-- ------------------------------------------------------------
update stores as s
   set name         = v.nom,
       address      = v.adresse,
       postal_code  = v.code_postal,
       city         = v.ville,
       region       = v.region,
       enseigne     = v.enseigne,
       network      = v.network,
       updated_at   = now()
  from (values
${valeurs.join(",\n")}
  ) as v (reference, nom, adresse, code_postal, ville, region, enseigne, network)
 where s.external_ref = v.reference
   and (s.name          is distinct from v.nom
     or s.address       is distinct from v.adresse
     or s.postal_code   is distinct from v.code_postal
     or s.city          is distinct from v.ville
     or s.region        is distinct from v.region
     or s.enseigne      is distinct from v.enseigne
     or s.network       is distinct from v.network);

-- ------------------------------------------------------------
-- 2. Les trois doublons du fichier de Gérardo.
--    Deux lignes pour un seul point de vente : le second exemplaire n'est
--    jamais visité, donc sa dette de visite monte indéfiniment et il finit en
--    tête des priorités. C'est exactement ce que le produit doit empêcher.
--
${ecartees}
-- ------------------------------------------------------------

-- 2a. Les visites planifiées sur ces lignes n'ont plus d'objet.
update visits
   set active = false,
       motif_annulation = 'doublon du fichier source retiré'
 where active
   and store_id in (select id from stores where external_ref in (${refsEcartees}));

-- 2b. Les modèles de tournée qui les contiennent.
delete from routing_template_stops
 where store_id in (select id from stores where external_ref in (${refsEcartees}));

-- 2c. Les magasins eux-mêmes. La référence est libérée pour qu'elle ne bloque
--     plus un futur import, et le libellé part dans le nom pour rester lisible.
update stores
   set active       = false,
       name         = name || ' (doublon retiré)',
       external_ref = null,
       updated_at   = now()
 where active
   and external_ref in (${refsEcartees});

commit;

-- ============================================================
-- VÉRIFICATION — à lancer après le commit.
--
-- Attendu : sans_adresse = 2 (AD DELHAIZE WATERLOO et AD DELHAIZE WAVRE,
-- en attente de la réponse de Gérardo), ad_delhaize = 80, proxy = 5,
-- delhaize_integres = 1, intermarche = 95.
--
-- \`magasins_actifs\` doit valoir ${valeurs.length} MOINS les magasins que tu aurais
-- désactivés toi-même : \`desactives_hors_doublons\` les compte. Si ce nombre
-- n'est pas 0, regarde la deuxième requête pour savoir lesquels.
-- ============================================================
select
  count(*) filter (where active)                                 as magasins_actifs,
  count(*) filter (where active and address is null)             as sans_adresse,
  count(*) filter (where not active and external_ref is not null) as desactives_hors_doublons,
  count(*) filter (where active and enseigne = 'ad_delhaize')    as ad_delhaize,
  count(*) filter (where active and enseigne = 'delhaize')       as delhaize_integres,
  count(*) filter (where active and enseigne = 'proxy_delhaize') as proxy,
  count(*) filter (where active and enseigne = 'intermarche')    as intermarche
from stores;

-- Lesquels sont désactivés sans être des doublons ? (0 ligne = tout va bien)
select external_ref, name, city
from stores
where not active
  and external_ref is not null
order by external_ref;
`;

fs.writeFileSync(SORTIE, sql);
console.log(`\n${valeurs.length} magasins mis à jour, ${REFERENCES_ECARTEES.length} doublons désactivés`);
console.log(`→ ${SORTIE}\n`);
