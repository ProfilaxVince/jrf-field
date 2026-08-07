-- ============================================================
-- 00019 — Importer les passages venus d'un autre système
--
-- Aujourd'hui les commerciaux pointent dans Odoo. L'IT de Jacques Remy
-- transmet chaque jeudi un fichier des passages effectués. On l'injecte pour
-- que l'application vive avec des données réelles avant de demander à
-- l'équipe de changer d'outil.
--
-- Deux tables, deux problèmes distincts :
--
--   · `external_refs` — le RAPPROCHEMENT. Le fichier désigne un magasin et un
--     commercial avec les identifiants du système source, pas les nôtres.
--     Cette table mémorise la correspondance une fois pour toutes : Gérardo ne
--     rapproche un code qu'une seule fois dans sa vie.
--
--   · `visit_imports` — l'IDEMPOTENCE. Le fichier hebdomadaire recouvre
--     souvent la semaine précédente. Sans clé de reprise, réimporter
--     dupliquerait chaque passage. ⚠️ `visits` n'a AUCUNE contrainte
--     d'unicité (constat du 07/08) : rien dans la base n'empêche aujourd'hui
--     deux visites identiques.
--
-- Choix assumé : on ne pose PAS de contrainte d'unicité sur `visits`
-- elle-même. Un commercial peut légitimement repasser deux fois le même jour
-- dans le même magasin — une visite le matin, un dépannage l'après-midi. La
-- protection appartient à l'import, pas au modèle métier.
-- ============================================================

-- `create type` n'a pas de `if not exists` : sans ce garde, rejouer le script
-- échoue dès la première ligne — et Vincent le colle d'un bloc dans le SQL
-- Editor, souvent deux fois pour être sûr.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'external_kind') then
    create type external_kind as enum ('store', 'user');
  end if;
end $$;

create table if not exists external_refs (
  id         uuid primary key default gen_random_uuid(),
  kind       external_kind not null,
  source     text not null,              -- 'odoo', 'excel-it'…
  code       text not null,              -- l'identifiant DU SYSTÈME SOURCE
  target_id  uuid not null,              -- notre stores.id ou app_users.id
  created_at timestamptz not null default now(),
  unique (kind, source, code)
);

comment on table external_refs is
  'Correspondance entre les identifiants d''un système tiers et les nôtres. '
  'Renseignée une fois, au premier import qui rencontre un code inconnu.';

create index if not exists external_refs_cible_idx on external_refs (kind, target_id);

-- ------------------------------------------------------------
-- Idempotence : une ligne du fichier source ↔ une visite, pour toujours.
-- `cle` est l'identifiant de ligne du système source quand il existe, sinon
-- une empreinte reproductible (magasin + commercial + date + heure).
-- ------------------------------------------------------------
create table if not exists visit_imports (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  cle         text not null,
  visit_id    uuid not null references visits (id) on delete cascade,
  importe_le  timestamptz not null default now(),
  unique (source, cle)
);

comment on table visit_imports is
  'Trace de chaque ligne importée. Réimporter le même fichier ne crée rien : '
  'la clé est déjà connue et la visite existante est simplement mise à jour.';

create index if not exists visit_imports_visit_idx on visit_imports (visit_id);

-- ------------------------------------------------------------
-- RLS — écriture réservée à l'Admin, comme tout ce qui touche au parc.
-- La lecture reste ouverte : le rapprochement n'est pas un secret, et un
-- écran de contrôle doit pouvoir l'afficher.
-- ------------------------------------------------------------
alter table external_refs enable row level security;
alter table visit_imports enable row level security;

drop policy if exists external_refs_read on external_refs;
create policy external_refs_read on external_refs for select to authenticated using (true);
drop policy if exists external_refs_admin_write on external_refs;
create policy external_refs_admin_write on external_refs for insert to authenticated
  with check (is_admin());
drop policy if exists external_refs_admin_update on external_refs;
create policy external_refs_admin_update on external_refs for update to authenticated
  using (is_admin());
drop policy if exists external_refs_admin_delete on external_refs;
create policy external_refs_admin_delete on external_refs for delete to authenticated
  using (is_admin());

drop policy if exists visit_imports_read on visit_imports;
create policy visit_imports_read on visit_imports for select to authenticated using (true);
drop policy if exists visit_imports_admin_write on visit_imports;
create policy visit_imports_admin_write on visit_imports for insert to authenticated
  with check (is_admin());
drop policy if exists visit_imports_admin_update on visit_imports;
create policy visit_imports_admin_update on visit_imports for update to authenticated
  using (is_admin());

-- ------------------------------------------------------------
-- Marquer la provenance d'une visite.
-- Sans cela, impossible de distinguer une visite saisie par un commercial
-- d'une visite reconstituée depuis un fichier — et donc impossible de
-- reprendre proprement le jour où l'équipe basculera sur l'application.
-- ------------------------------------------------------------
alter table visits add column if not exists source text;

comment on column visits.source is
  'NULL = saisie dans l''application. Sinon le système d''origine (''excel-it'', ''odoo'').';

insert into supabase_migrations.schema_migrations (version, name)
values ('00019', 'import_passages')
on conflict (version) do nothing;


-- ============================================================
-- Vérification — 4 lignes « OK »
-- ============================================================
select 'table external_refs' as controle,
       case when exists (select 1 from information_schema.tables where table_name='external_refs')
            then 'OK' else 'MANQUANT' end as resultat
union all
select 'table visit_imports',
       case when exists (select 1 from information_schema.tables where table_name='visit_imports')
            then 'OK' else 'MANQUANT' end
union all
select 'colonne visits.source',
       case when exists (select 1 from information_schema.columns
                         where table_name='visits' and column_name='source')
            then 'OK' else 'MANQUANT' end
union all
select 'cle de reprise unique',
       case when exists (select 1 from pg_constraint
                         where conname like 'visit_imports_source_cle%')
            then 'OK' else 'MANQUANT' end;
