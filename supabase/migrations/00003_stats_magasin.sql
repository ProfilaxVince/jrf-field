-- ============================================================
-- 00003 — Statistiques centrées MAGASIN
-- Décision utilisateur du 03/08/2026 : l'Admin ne veut pas mesurer la quantité
-- de travail des commerciaux, mais la répartition de l'effort sur le parc.
-- Grain de référence = le magasin, pas la personne.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Retrait des vues de productivité individuelle
--    Elles répondaient à une question que l'Admin ne pose pas ("qui en fait le
--    plus ?") et exposaient un usage de contrôle du salarié dont personne n'a
--    besoin ici. `v_charge_semaine` est conservée : elle sert à répartir la
--    charge à venir (planification), pas à évaluer une personne.
-- ------------------------------------------------------------
drop view if exists v_stats_mois_commercial;
drop view if exists v_stats_annee_commercial;

-- ------------------------------------------------------------
-- 2. Visites qui comptent (base commune à toutes les vues ci-dessous)
--    Le montage de rayon est exclu partout : quotidien sur 95 magasins, il
--    écraserait toutes les parts de visites et rendrait les % illisibles.
-- ------------------------------------------------------------
create or replace view v_visites_comptees as
select
  v.id,
  v.store_id,
  v.scheduled_date,
  v.visit_type,
  v.checkout_at,
  date_trunc('month', v.scheduled_date)::date as mois,
  date_trunc('year',  v.scheduled_date)::date as annee
from visits v
where v.active
  and v.status = 'faite'
  and v.visit_type <> 'montage_rayon';

-- ------------------------------------------------------------
-- 3. Part de visites par magasin et par mois
--    part_visites_pct  = visites du magasin / total des visites du mois
--    part_ca_pct       = CA du magasin / CA du parc actif
--    indice_effort     = part_visites_pct / part_ca_pct
--                        1,0 = effort proportionnel au poids du magasin
--                        > 1 = sur-visité   |   < 1 = sous-visité
--    C'est l'indice qui répond à « est-ce que je mets mon temps au bon endroit ? ».
-- ------------------------------------------------------------
create or replace view v_stats_magasin_mois as
with totaux as (
  select mois, count(*)::numeric as visites_mois
  from v_visites_comptees
  group by mois
), ca_parc as (
  select sum(annual_revenue_eur)::numeric as ca_total
  from stores where active
)
select
  s.id                                   as store_id,
  s.name                                 as magasin,
  s.enseigne,
  s.region,
  t.tier,
  m.mois,
  count(v.id)                            as visites,
  round(100.0 * count(v.id) / nullif(tot.visites_mois, 0), 2)          as part_visites_pct,
  round(100.0 * s.annual_revenue_eur / nullif(c.ca_total, 0), 2)       as part_ca_pct,
  round(
    (100.0 * count(v.id) / nullif(tot.visites_mois, 0))
    / nullif(100.0 * s.annual_revenue_eur / nullif(c.ca_total, 0), 0),
    2
  )                                                                    as indice_effort,
  count(v.id) filter (where v.visit_type = 'urgence')                  as dont_urgences,
  count(v.id) filter (where v.visit_type = 'demo')                     as dont_demos
from stores s
join v_store_tier t on t.store_id = s.id
cross join ca_parc c
cross join (select distinct mois from v_visites_comptees) m
left join v_visites_comptees v on v.store_id = s.id and v.mois = m.mois
left join totaux tot on tot.mois = m.mois
where s.active
group by s.id, s.name, s.enseigne, s.region, t.tier, m.mois,
         tot.visites_mois, s.annual_revenue_eur, c.ca_total;

-- ------------------------------------------------------------
-- 4. Même lecture à l'année
-- ------------------------------------------------------------
create or replace view v_stats_magasin_annee as
with totaux as (
  select annee, count(*)::numeric as visites_annee
  from v_visites_comptees
  group by annee
), ca_parc as (
  select sum(annual_revenue_eur)::numeric as ca_total
  from stores where active
)
select
  s.id                                   as store_id,
  s.name                                 as magasin,
  s.enseigne,
  s.region,
  t.tier,
  a.annee,
  count(v.id)                            as visites,
  round(100.0 * count(v.id) / nullif(tot.visites_annee, 0), 2)         as part_visites_pct,
  round(100.0 * s.annual_revenue_eur / nullif(c.ca_total, 0), 2)       as part_ca_pct,
  round(
    (100.0 * count(v.id) / nullif(tot.visites_annee, 0))
    / nullif(100.0 * s.annual_revenue_eur / nullif(c.ca_total, 0), 0),
    2
  )                                                                    as indice_effort,
  coalesce(d.frequence_cible_jours, 0)                                 as frequence_cible_jours,
  round(365.0 / nullif(count(v.id), 0), 1)                             as frequence_reelle_jours
from stores s
join v_store_tier t on t.store_id = s.id
left join v_store_dette d on d.store_id = s.id
cross join ca_parc c
cross join (select distinct annee from v_visites_comptees) a
left join v_visites_comptees v on v.store_id = s.id and v.annee = a.annee
left join totaux tot on tot.annee = a.annee
where s.active
group by s.id, s.name, s.enseigne, s.region, t.tier, a.annee,
         tot.visites_annee, s.annual_revenue_eur, c.ca_total, d.frequence_cible_jours;

-- ------------------------------------------------------------
-- 5. Même calcul sur une période libre (export CSV/PDF du Lot 7)
-- ------------------------------------------------------------
create or replace function stats_magasins(p_debut date, p_fin date)
returns table (
  store_id uuid,
  magasin text,
  enseigne enseigne,
  region region_type,
  tier tier_type,
  visites bigint,
  part_visites_pct numeric,
  part_ca_pct numeric,
  indice_effort numeric,
  jours_depuis_derniere_visite int
)
language sql stable as $$
  with periode as (
    select * from v_visites_comptees
    where scheduled_date between p_debut and p_fin
  ), total as (
    select count(*)::numeric as n from periode
  ), ca_parc as (
    select sum(annual_revenue_eur)::numeric as ca_total from stores where active
  )
  select
    s.id, s.name, s.enseigne, s.region, t.tier,
    count(p.id),
    round(100.0 * count(p.id) / nullif((select n from total), 0), 2),
    round(100.0 * s.annual_revenue_eur / nullif((select ca_total from ca_parc), 0), 2),
    round(
      (100.0 * count(p.id) / nullif((select n from total), 0))
      / nullif(100.0 * s.annual_revenue_eur / nullif((select ca_total from ca_parc), 0), 0), 2
    ),
    d.jours_depuis_derniere_visite
  from stores s
  join v_store_tier t on t.store_id = s.id
  left join v_store_dette d on d.store_id = s.id
  left join periode p on p.store_id = s.id
  where s.active
  group by s.id, s.name, s.enseigne, s.region, t.tier,
           s.annual_revenue_eur, d.jours_depuis_derniere_visite;
$$;

-- ------------------------------------------------------------
-- 6. Synthèse par tier : l'effort suit-il la segmentation ?
--    Un tier A doit concentrer nettement plus de visites que son poids en nombre
--    de magasins. Si l'indice tombe sous 1, la stratégie n'est pas appliquée.
-- ------------------------------------------------------------
create or replace view v_stats_effort_par_tier as
with base as (
  select t.tier, s.id as store_id, s.annual_revenue_eur
  from stores s join v_store_tier t on t.store_id = s.id
  where s.active
), v as (
  select b.tier, count(vc.id) as visites
  from base b left join v_visites_comptees vc on vc.store_id = b.store_id
  group by b.tier
)
select
  b.tier,
  count(*)                                                            as magasins,
  round(100.0 * count(*) / sum(count(*)) over (), 1)                  as part_parc_pct,
  max(v.visites)                                                      as visites,
  round(100.0 * max(v.visites) / nullif(sum(max(v.visites)) over (), 0), 1) as part_visites_pct,
  round(100.0 * sum(b.annual_revenue_eur) / nullif(sum(sum(b.annual_revenue_eur)) over (), 0), 1) as part_ca_pct,
  round(
    (100.0 * max(v.visites) / nullif(sum(max(v.visites)) over (), 0))
    / nullif(100.0 * count(*) / sum(count(*)) over (), 0), 2
  )                                                                   as indice_effort
from base b
join v on v.tier = b.tier
group by b.tier;
