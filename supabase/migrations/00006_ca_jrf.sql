-- ============================================================
-- 00006 — Le CA de tiering est le CA JRF, pas le CA du magasin
-- Confirmation utilisateur du 03/08/2026.
--
-- L'ambiguïté était coûteuse : classer sur le CA total du point de vente
-- aurait mis en tier A des hypermarchés où JRF vend peu, et fait disparaître
-- des magasins moyens qui pèsent réellement dans le chiffre.
-- Le nom de colonne rend l'erreur impossible au moment de l'import CSV (Lot 1).
--
-- Postgres répercute le renommage dans toutes les vues qui référencent la
-- colonne (v_store_tier, v_stats_magasin_*, stats_magasins) : rien à recréer.
-- ============================================================

alter table stores rename column annual_revenue_eur to jrf_revenue_eur;

comment on column stores.jrf_revenue_eur is
  'Chiffre d''affaires ANNUEL RÉALISÉ PAR JRF avec ce magasin, en euros. '
  'Ce n''est PAS le chiffre d''affaires du point de vente. '
  'Source du tiering (A = top 20 %, B = 20-60 %, C = reste) et du calcul de part_ca_pct.';

-- Exercice de référence du montant ci-dessus : sans lui, on ne sait pas si le
-- classement s'appuie sur l'année en cours ou sur l'exercice clos.
alter table stores add column jrf_revenue_year int;

comment on column stores.jrf_revenue_year is
  'Exercice auquel se rapporte jrf_revenue_eur (ex. 2025). Permet de savoir '
  'sur quelle base un magasin a été classé et de détecter un tiering périmé.';
