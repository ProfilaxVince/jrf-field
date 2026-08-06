-- ============================================================
-- CORRECTIF DE LENTEUR — à coller dans l'éditeur SQL de Supabase
--
-- À utiliser si les écrans « Semaine » et « À voir en priorité » tournent
-- longtemps puis affichent « Impossible de charger ».
--
-- Reprend la migration 00012. Rejouable sans risque.
-- ============================================================

comment on function frequence_cible(uuid) is
  'Fréquence cible d''UN magasin. Coûteuse : déclenche tout le calcul de capacité. '
  'Ne jamais appeler par ligne dans une vue — voir v_store_dette (migration 00012).';

create or replace view v_store_dette as
with weights as (
  select value from app_settings where key = 'tier_weights'
),
freq_defaut as (
  select value from app_settings where key = 'target_frequency_days'
),
mode_frequence as (
  select (value #>> '{}') as valeur from app_settings where key = 'frequence_mode'
),
freq_par_tier as (
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
  join v_store_tier t        on t.store_id = s.id
  left join v_store_last_visit lv on lv.store_id = s.id
  left join freq_par_tier fp on fp.tier = t.tier
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

insert into supabase_migrations.schema_migrations (version, name)
values ('00012', 'dette_calcul_unique')
on conflict (version) do nothing;


-- ============================================================
-- Vérification — doit répondre en moins d'une seconde,
-- et renvoyer 185 (ou le nombre de magasins actifs).
-- ============================================================
select count(*) as magasins_calcules from v_store_dette;
