-- ============================================================
-- 00007 — Tiers figés
-- Décision utilisateur du 03/08/2026 : le tier ne se recalcule plus en continu.
--
-- Motif : un tier recalculé à chaque requête fait bouger la fréquence cible,
-- donc la dette, donc l'ordre de la Vue semaine — sans qu'il ne se soit rien
-- passé sur le terrain. L'utilisateur voit ses magasins changer de place et
-- perd confiance dans l'outil.
--
-- Nouveau fonctionnement :
--   · le tier est une VALEUR STOCKÉE, écrite par un recalcul explicite ;
--   · le recalcul est une action de l'Admin (bouton « Recalculer les tiers ») ;
--   · l'ordre de résolution reste : override manuel > tier figé > calcul
--     dynamique de repli (uniquement si aucun figeage n'a jamais eu lieu,
--     pour ne jamais livrer une application sans tiers).
-- ============================================================

alter table stores
  add column tier_fige tier_type,
  add column tier_fige_at timestamptz,
  add column tier_fige_year int;

comment on column stores.tier_fige is
  'Tier figé lors du dernier recalcul. Ne bouge pas tant que l''Admin ne relance pas le calcul.';
comment on column stores.tier_fige_year is
  'Exercice du CA JRF ayant servi au figeage (jrf_revenue_year au moment du calcul).';

create index stores_tier_fige_idx on stores (tier_fige) where active;

-- ------------------------------------------------------------
-- 1. Moteur de recalcul (interne, sans contrôle de rôle)
--    Écrit tier_fige à partir du rang percentile du CA JRF, et trace
--    chaque changement dans audit_log — on doit pouvoir expliquer
--    pourquoi un magasin a changé de catégorie.
-- ------------------------------------------------------------
create or replace function _recalculer_tiers_interne(p_actor uuid default null)
returns table (tier tier_type, magasins int, changements int)
language plpgsql as $$
declare
  v_seuil_a numeric;
  v_seuil_b numeric;
begin
  select (value->>'A')::numeric, (value->>'B')::numeric
    into v_seuil_a, v_seuil_b
  from app_settings where key = 'tier_percentiles';

  create temp table _nouveaux on commit drop as
  with ranked as (
    select s.id,
           s.tier_fige as ancien,
           percent_rank() over (order by s.jrf_revenue_eur desc nulls last) as pr,
           s.jrf_revenue_year
    from stores s
    where s.active
  )
  select id, ancien, jrf_revenue_year,
         (case
            when pr <= v_seuil_a then 'A'
            when pr <= v_seuil_b then 'B'
            else 'C'
          end)::tier_type as nouveau
  from ranked;

  -- Trace AVANT écriture : sinon on ne sait plus ce qui a changé.
  insert into audit_log (table_name, record_id, action, actor_id, payload)
  select 'stores', n.id, 'tier_recalcule', p_actor,
         jsonb_build_object('ancien', n.ancien, 'nouveau', n.nouveau, 'exercice', n.jrf_revenue_year)
  from _nouveaux n
  where n.ancien is distinct from n.nouveau;

  update stores s
     set tier_fige      = n.nouveau,
         tier_fige_at   = now(),
         tier_fige_year = n.jrf_revenue_year
    from _nouveaux n
   where s.id = n.id;

  return query
    select n.nouveau,
           count(*)::int,
           count(*) filter (where n.ancien is distinct from n.nouveau)::int
    from _nouveaux n
    group by n.nouveau
    order by n.nouveau;
end $$;

-- ------------------------------------------------------------
-- 2. Action publique : réservée à l'Admin
-- ------------------------------------------------------------
create or replace function recalculer_tiers()
returns table (tier tier_type, magasins int, changements int)
language plpgsql security invoker as $$
begin
  if not is_admin() then
    raise exception 'Seul le responsable commercial peut recalculer les tiers.';
  end if;
  return query select * from _recalculer_tiers_interne(current_app_user_id());
end $$;

-- ------------------------------------------------------------
-- 3. Résolution du tier : override > figé > calcul de repli
-- ------------------------------------------------------------
create or replace view v_store_tier as
with ranked as (
  select s.id, s.tier_override, s.tier_fige,
         percent_rank() over (order by s.jrf_revenue_eur desc nulls last) as pr
  from stores s
  where s.active
)
select
  r.id as store_id,
  coalesce(
    r.tier_override,
    r.tier_fige,
    case
      when r.pr <= (select (value->>'A')::numeric from app_settings where key = 'tier_percentiles') then 'A'
      when r.pr <= (select (value->>'B')::numeric from app_settings where key = 'tier_percentiles') then 'B'
      else 'C'
    end::tier_type
  ) as tier
from ranked r;

-- ------------------------------------------------------------
-- 4. Dérive : de combien le classement figé s'écarte-t-il de la réalité ?
--    Sert à décider QUAND relancer le calcul, sans le relancer tout seul.
-- ------------------------------------------------------------
create or replace view v_derive_tiers as
with actuel as (
  select s.id, s.name, s.tier_fige, s.tier_override, s.tier_fige_at, s.jrf_revenue_eur,
         (case
            when percent_rank() over (order by s.jrf_revenue_eur desc nulls last)
                 <= (select (value->>'A')::numeric from app_settings where key = 'tier_percentiles') then 'A'
            when percent_rank() over (order by s.jrf_revenue_eur desc nulls last)
                 <= (select (value->>'B')::numeric from app_settings where key = 'tier_percentiles') then 'B'
            else 'C'
          end)::tier_type as tier_theorique
  from stores s
  where s.active
)
select
  id as store_id, name as magasin, jrf_revenue_eur,
  tier_fige, tier_theorique, tier_override,
  tier_fige_at,
  (tier_fige is distinct from tier_theorique and tier_override is null) as a_derive
from actuel;

create or replace view v_derive_tiers_resume as
select
  count(*)                                    as magasins,
  count(*) filter (where a_derive)            as ont_derive,
  round(100.0 * count(*) filter (where a_derive) / nullif(count(*), 0), 1) as derive_pct,
  max(tier_fige_at)                           as dernier_recalcul
from v_derive_tiers;

-- ------------------------------------------------------------
-- 5. Figeage initial
--    L'application ne doit jamais s'ouvrir sans tiers (règle d'ergonomie :
--    aucun écran vide demandant de « commencer par paramétrer »).
--    Note : le seed s'exécutant APRÈS les migrations, ce premier appel ne
--    trouve rien. Un trigger fige donc chaque magasin à l'insertion, et
--    l'Admin relance un recalcul global après l'import réel.
-- ------------------------------------------------------------
select * from _recalculer_tiers_interne(null);

create or replace function stores_fige_tier_initial()
returns trigger language plpgsql as $$
begin
  if new.tier_fige is null then
    -- Valeur provisoire : le tier définitif viendra du recalcul global
    -- lancé par l'Admin une fois tout le parc chargé.
    new.tier_fige := 'C';
    new.tier_fige_year := new.jrf_revenue_year;
  end if;
  return new;
end $$;

create trigger stores_fige_tier_initial_trg
  before insert on stores
  for each row execute function stores_fige_tier_initial();
