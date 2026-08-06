-- ============================================================
-- 00013 — Le calcul de capacité est MATÉRIALISÉ, pas seulement isolé
--
-- Suite de 00012, qui n'a pas suffi.
--
-- 00012 sortait la fréquence par tier dans un bloc `with` — mais depuis
-- PostgreSQL 12, un `with` référencé une seule fois est INLINÉ dans la requête.
-- Le planificateur reste donc libre de le replacer du côté interne d'une
-- boucle imbriquée, et de le réévaluer une fois par magasin. Le problème que
-- 00012 croyait supprimer pouvait revenir tel quel, au gré du plan choisi.
--
-- `as materialized` retire cette liberté : le bloc est calculé une fois,
-- stocké, puis joint. Trois lignes, une seule fois, quel que soit le plan.
--
-- Second gain, indépendant : `jours_travailles()` relisait `app_settings`
-- pour CHAQUE jour examiné. Sur ~105 semaines × 6 personnes × 7 jours, cela
-- faisait plus de 4 000 sous-requêtes pour lire une valeur qui ne change pas.
-- Elle est désormais lue une fois par appel.
-- ============================================================

-- ------------------------------------------------------------
-- 1. `jours_travailles` : le paramètre est lu une fois, pas par jour
-- ------------------------------------------------------------
create or replace function jours_travailles(p_user uuid, p_debut date, p_fin date)
returns int language sql stable as $$
  with param as (
    select (value)::int as jours_ouvres
    from app_settings where key = 'jours_ouvres_semaine'
  )
  select count(*)::int
  from generate_series(p_debut, p_fin, interval '1 day') d
  cross join param p
  where extract(isodow from d) <= p.jours_ouvres
    and not exists (select 1 from public_holidays h where h.jour = d::date)
    and not exists (
      select 1 from absences a
      where a.user_id = p_user and a.active
        and d::date between a.date_debut and a.date_fin
    );
$$;

-- ------------------------------------------------------------
-- 2. `v_store_dette` : capacité matérialisée
--    Colonnes strictement identiques — les vues qui en dépendent
--    (v_frequence_reelle_magasin, v_stats_magasin_*, taux_couverture)
--    continuent de fonctionner sans être recréées.
-- ------------------------------------------------------------
create or replace view v_store_dette as
with weights as materialized (
  select value from app_settings where key = 'tier_weights'
),
freq_defaut as materialized (
  select value from app_settings where key = 'target_frequency_days'
),
mode_frequence as materialized (
  select (value #>> '{}') as valeur from app_settings where key = 'frequence_mode'
),
-- LE point du correctif : 3 lignes, calculées une seule fois pour tout le parc,
-- que le planificateur ne peut plus replacer dans une boucle.
freq_par_tier as materialized (
  select f.tier, f.frequence_atteignable_jours::int as jours
  from v_frequences_calculees f
),
base as (
  select
    s.id   as store_id,
    s.name,
    t.tier,
    coalesce(
      s.target_frequency_days_override,
      case when (select valeur from mode_frequence) = 'auto' then fp.jours end,
      ((select value from freq_defaut)->>(t.tier::text))::int
    ) as frequence_cible_jours,
    lv.last_visit_at
  from stores s
  join v_store_tier t             on t.store_id = s.id
  left join v_store_last_visit lv on lv.store_id = s.id
  left join freq_par_tier fp      on fp.tier = t.tier
  where s.active
)
select
  b.store_id,
  b.name,
  b.tier,
  b.frequence_cible_jours,
  b.last_visit_at,
  case
    when b.last_visit_at is null then null
    else extract(day from now() - b.last_visit_at)::int
  end as jours_depuis_derniere_visite,
  case
    when b.last_visit_at is null then 3.0
    else round(
      (extract(epoch from now() - b.last_visit_at) / 86400.0)
      / nullif(b.frequence_cible_jours, 0), 2)
  end as dette_visite,
  case
    when b.last_visit_at is null
      then 3.0 * ((select value from weights)->>(b.tier::text))::numeric
    else round(
      ((extract(epoch from now() - b.last_visit_at) / 86400.0)
       / nullif(b.frequence_cible_jours, 0))
      * ((select value from weights)->>(b.tier::text))::numeric, 2)
  end as score_priorite
from base b;
