-- ============================================================
-- RETIRER LES 185 MAGASINS FICTIFS — avant d'importer le fichier réel
--
-- Constat du 06/08/2026 : le seed contient 185 magasins inventés, mais
-- seulement 87 NOMS distincts (7 « AD Delhaize Diksmuide », 5 « Intermarché
-- Nivelles »…). Ce ne sont pas des doublons au sens technique — chaque ligne a
-- sa référence et son adresse — mais à l'écran ils sont indiscernables, donc
-- inutilisables pour travailler.
--
-- Ce script ne SUPPRIME rien (règle du projet : aucune suppression physique).
-- Il désactive les magasins fictifs et tout ce qui les référence. Ils
-- disparaissent des écrans, l'historique reste intact, et un `active = true`
-- les ferait revenir si besoin.
--
-- À exécuter JUSTE AVANT l'import du fichier réel via Magasins → Importer un CSV.
-- ============================================================

-- 1. Les visites planifiées sur des magasins fictifs n'ont plus d'objet.
update visits
   set active = false,
       motif_annulation = 'magasin fictif retiré avant import du fichier réel'
 where active
   and store_id in (select id from stores where external_ref like 'FICTIF-%');

-- 2. Les modèles de tournée qui les contiennent (table de composition,
--    sans historique métier : on retire les lignes).
delete from routing_template_stops
 where store_id in (select id from stores where external_ref like 'FICTIF-%');

-- 3. Les magasins eux-mêmes.
update stores
   set active = false
 where active
   and external_ref like 'FICTIF-%';

-- ============================================================
-- Vérification — « restants » doit tomber à 0,
-- puis remonter au nombre de lignes de TON fichier après l'import.
-- ============================================================
select
  count(*) filter (where active)                                  as restants,
  count(*) filter (where not active and external_ref like 'FICTIF-%') as fictifs_retires
from stores;
