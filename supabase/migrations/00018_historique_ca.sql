-- ============================================================
-- 00018 — Historique du CA JRF par magasin et par exercice
--
-- Faille corrigée : `stores.jrf_revenue_eur` + `jrf_revenue_year` ne stockent
-- QU'UN exercice. Saisir 2026 écrase 2025, définitivement. Or le tier A/B/C
-- dérive de ce montant (00007) — on ne pouvait donc ni dire qu'un magasin est
-- passé de B à A, ni pourquoi, ni distinguer un magasin qui progresse d'un
-- magasin qui décroche. Sur un produit dont le cœur est la priorisation, c'est
-- l'information la plus chère à perdre et la moins chère à garder.
--
-- Choix de modèle : `store_revenues` devient la SOURCE, et les deux colonnes
-- de `stores` deviennent le miroir de l'exercice le plus récent, entretenu par
-- trigger. Pourquoi ne pas les supprimer : elles sont lues par le calcul des
-- tiers (00007) et par les statistiques d'effort (00003). Les garder dérivées
-- évite de réécrire une vingtaine de vues pour un gain nul — même patron que
-- `app_users.full_name` en 00015.
-- ============================================================

create table if not exists store_revenues (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores (id) on delete cascade,
  year        int  not null check (year between 2000 and 2100),
  amount_eur  numeric not null check (amount_eur >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, year)
);

comment on table store_revenues is
  'CA JRF par magasin et par exercice. SOURCE de vérité : stores.jrf_revenue_eur '
  'n''en est que le reflet, pour l''exercice le plus récent.';

create index if not exists store_revenues_store_idx on store_revenues (store_id, year desc);

-- ------------------------------------------------------------
-- 1. Reprise : l'unique exercice connu devient la première ligne d'historique.
--    `on conflict do nothing` — rejouer le script ne doit pas écraser un
--    montant corrigé à la main depuis.
-- ------------------------------------------------------------
insert into store_revenues (store_id, year, amount_eur)
select id, jrf_revenue_year, jrf_revenue_eur
  from stores
 where jrf_revenue_eur is not null
   and jrf_revenue_year is not null
on conflict (store_id, year) do nothing;

-- ------------------------------------------------------------
-- 2. `stores` reflète l'exercice le plus récent.
--    Recalculé à chaque écriture sur l'historique, y compris à la suppression
--    d'une ligne : effacer 2026 doit faire redescendre le magasin sur 2025,
--    pas le laisser sur un montant qui n'existe plus.
-- ------------------------------------------------------------
create or replace function store_revenues_refleter()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_store uuid := coalesce(new.store_id, old.store_id);
begin
  update stores s
     set jrf_revenue_eur  = r.amount_eur,
         jrf_revenue_year = r.year,
         updated_at       = now()
    from (
      select amount_eur, year
        from store_revenues
       where store_id = v_store
       order by year desc
       limit 1
    ) as r
   where s.id = v_store
     and (s.jrf_revenue_eur is distinct from r.amount_eur
       or s.jrf_revenue_year is distinct from r.year);

  -- Plus aucun exercice : le magasin n'a plus de CA connu.
  if not exists (select 1 from store_revenues where store_id = v_store) then
    update stores
       set jrf_revenue_eur = null, jrf_revenue_year = null, updated_at = now()
     where id = v_store
       and (jrf_revenue_eur is not null or jrf_revenue_year is not null);
  end if;

  return null;
end $$;

drop trigger if exists store_revenues_refleter_trg on store_revenues;
create trigger store_revenues_refleter_trg
  after insert or update or delete on store_revenues
  for each row execute function store_revenues_refleter();

-- ------------------------------------------------------------
-- 3. Évolution d'un exercice à l'autre.
--    `lag` sur l'exercice précédent RÉELLEMENT présent, pas sur année-1 : un
--    magasin dont 2025 manque doit se comparer à 2024, pas afficher un trou.
-- ------------------------------------------------------------
create or replace view v_store_revenue_evolution as
select
  r.store_id,
  s.name                                   as magasin,
  s.city                                   as ville,
  s.enseigne,
  r.year                                   as exercice,
  r.amount_eur                             as montant,
  lag(r.year)       over w                 as exercice_precedent,
  lag(r.amount_eur) over w                 as montant_precedent,
  r.amount_eur - lag(r.amount_eur) over w  as ecart_eur,
  round(
    100.0 * (r.amount_eur - lag(r.amount_eur) over w)
    / nullif(lag(r.amount_eur) over w, 0), 1
  )                                        as ecart_pct
from store_revenues r
join stores s on s.id = r.store_id
where s.active
window w as (partition by r.store_id order by r.year);

comment on view v_store_revenue_evolution is
  'Un exercice par ligne, avec l''écart au précédent exercice CONNU du magasin.';

-- ------------------------------------------------------------
-- 4. RLS — même règle que `stores` : tout le monde lit, seul l'Admin écrit.
--    Un commercial voit déjà le CA via `stores`, le cacher ici n'ajouterait
--    rien qu'une incohérence.
-- ------------------------------------------------------------
alter table store_revenues enable row level security;

drop policy if exists store_revenues_read on store_revenues;
create policy store_revenues_read on store_revenues for select to authenticated
  using (true);

drop policy if exists store_revenues_admin_insert on store_revenues;
create policy store_revenues_admin_insert on store_revenues for insert to authenticated
  with check (is_admin());

drop policy if exists store_revenues_admin_update on store_revenues;
create policy store_revenues_admin_update on store_revenues for update to authenticated
  using (is_admin());

-- Exception assumée au « aucune suppression physique » : une ligne de CA saisie
-- pour le mauvais exercice n'a pas d'histoire à conserver, et la garder
-- désactivée fausserait « l'exercice le plus récent ». L'`audit_log` en garde
-- la trace — y compris de la suppression, voir ci-dessous.
drop policy if exists store_revenues_admin_delete on store_revenues;
create policy store_revenues_admin_delete on store_revenues for delete to authenticated
  using (is_admin());

-- ------------------------------------------------------------
-- 5. `log_audit()` réparée.
--
--    Elle lisait `new.active` en dur. Toute table SANS colonne `active` faisait
--    donc échouer l'insertion avec « record "new" has no field "active" » —
--    `store_revenues` est la première dans ce cas, et l'erreur n'apparaissait
--    qu'à la première écriture, pas à la création du trigger.
--
--    Le champ est désormais lu à travers `to_jsonb`, qui renvoie NULL quand la
--    colonne n'existe pas au lieu de lever. Le comportement des tables qui ONT
--    un `active` (stores, visits, incidents…) est inchangé.
--
--    La suppression est tracée au passage : elle ne l'était pour aucune table,
--    et `store_revenues` est justement celle où elle est autorisée.
-- ------------------------------------------------------------
create or replace function log_audit()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_avant jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_apres jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
begin
  insert into audit_log (table_name, record_id, action, actor_id, payload)
  values (
    tg_table_name,
    coalesce((v_apres ->> 'id')::uuid, (v_avant ->> 'id')::uuid),
    case
      when tg_op = 'INSERT' then 'insert'
      when tg_op = 'DELETE' then 'delete'
      when v_apres ->> 'active' = 'false' and v_avant ->> 'active' = 'true' then 'soft_delete'
      else 'update'
    end,
    current_app_user_id(),
    coalesce(v_apres, v_avant)
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_store_revenues after insert or update or delete on store_revenues
  for each row execute function log_audit();
