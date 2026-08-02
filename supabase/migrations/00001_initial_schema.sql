-- ============================================================
-- 00001 — Schéma initial JRF Field
-- Règles : RLS sur CHAQUE table dès création (table sans policy = bug bloquant).
-- Logique métier agrégée en SQL (vues/fonctions), jamais côté front.
-- Aucune suppression physique : active = false + audit_log.
-- Noms techniques en anglais snake_case, libellés/valeurs métier en français
-- quand ils sont affichés tels quels.
-- ============================================================

-- ---------- Types énumérés ----------
create type enseigne as enum ('intermarche', 'ad_delhaize', 'proxy_delhaize', 'delhaize', 'spar');
create type network_type as enum ('by_mestdagh', 'independant', 'affilie', 'integre');
create type region_type as enum ('wallonie', 'bruxelles', 'flandre');
create type contact_lang as enum ('fr', 'nl');
create type tier_type as enum ('A', 'B', 'C');
create type visit_type as enum ('mise_en_rayon', 'conseil', 'demo', 'urgence', 'rattrapage');
create type visit_status as enum ('planifiee', 'faite', 'annulee', 'reportee');
create type incident_type as enum ('oubli_livraison', 'rupture', 'litige_qualite', 'autre');
create type incident_status as enum ('ouvert', 'en_cours', 'resolu');

-- ---------- Paramètres applicatifs (fréquences & poids paramétrables, pas en dur) ----------
create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into app_settings (key, value) values
  ('target_frequency_days', '{"A": 14, "B": 21, "C": 42}'),
  ('tier_weights', '{"A": 3, "B": 2, "C": 1}'),
  ('tier_percentiles', '{"A": 0.20, "B": 0.60}'); -- A = top 20 %, B = 20-60 %, C = reste

-- ---------- Utilisateurs applicatifs ----------
-- Le rôle n'est PAS un enum exclusif : l'admin porte aussi un portefeuille de visites.
create table app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id),
  full_name text not null,
  nickname text not null,            -- affiché en priorité (deux Martella : jamais le nom seul)
  color_hex text not null,           -- couleur de personne (liseré + pastille), source Excel
  is_admin boolean not null default false,
  access_code_hash text,             -- code d'accès 8 caractères, HASHÉ (jamais en clair)
  pin_hash text,                     -- PIN 6 chiffres, HASHÉ
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Sessions liées à l'appareil, révocables par l'admin.
create table device_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users (id),
  device_label text,
  refresh_token_hash text not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ---------- Magasins ----------
create table stores (
  id uuid primary key default gen_random_uuid(),
  external_ref text unique,          -- référence du fichier source
  name text not null,
  enseigne enseigne not null,
  network network_type,
  address text,
  postal_code text,
  city text not null,
  region region_type not null,
  zone text,                         -- zone de tournée (libellé libre admin)
  lat double precision,
  lng double precision,
  contact_lang contact_lang not null default 'fr', -- langue du chef de rayon (info, pas i18n)
  contact_name text,
  contact_phone text,
  annual_revenue_eur numeric,        -- CA annuel → tier calculé
  tier_override tier_type,           -- l'admin peut forcer le tier
  target_frequency_days_override int, -- fréquence spécifique magasin (sinon défaut du tier)
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Périmètre : quels magasins un commercial couvre.
create table store_assignments (
  user_id uuid not null references app_users (id),
  store_id uuid not null references stores (id),
  primary key (user_id, store_id)
);

-- ---------- Templates de routing ----------
create table routing_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  zone text,
  created_by uuid not null references app_users (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table routing_template_stops (
  template_id uuid not null references routing_templates (id),
  store_id uuid not null references stores (id),
  position int not null,
  duration_min int not null default 45,
  primary key (template_id, store_id)
);

-- ---------- Routings (tournée d'une personne pour une journée) ----------
create table routings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users (id),
  date date not null,
  template_id uuid references routing_templates (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- ---------- Visites ----------
create table visits (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id),
  user_id uuid not null references app_users (id),
  routing_id uuid references routings (id),
  position_in_day int,
  scheduled_date date not null,
  visit_type visit_type not null default 'conseil',
  status visit_status not null default 'planifiee',
  checkin_at timestamptz,
  checkout_at timestamptz,
  checkin_lat double precision,      -- géoloc PONCTUELLE, optionnelle, jamais de suivi continu (CCT n°81)
  checkin_lng double precision,
  report jsonb,                      -- compte rendu (champs exacts fixés au Lot 4)
  report_submitted_at timestamptz,
  relais_centrale boolean not null default false, -- "remonter à la centrale"
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visits_store_date_idx on visits (store_id, scheduled_date desc);
create index visits_user_date_idx on visits (user_id, scheduled_date);

-- ---------- Incidents ----------
create table incidents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id),
  reported_by uuid not null references app_users (id),
  incident_type incident_type not null,
  criticality int not null check (criticality between 1 and 3),
  description text,
  status incident_status not null default 'ouvert',
  linked_visit_id uuid references visits (id), -- visite urgence générée si criticité 3
  active boolean not null default true,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ---------- Journal d'audit ----------
create table audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,              -- 'insert' | 'update' | 'soft_delete'
  actor_id uuid references app_users (id),
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Fonctions & vues métier (source de vérité des calculs)
-- ============================================================

-- Utilisateur applicatif courant (mappé sur auth.uid()).
create or replace function current_app_user_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from app_users where auth_user_id = auth.uid() and active
$$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from app_users where auth_user_id = auth.uid() and active), false)
$$;

-- Tier effectif : override admin sinon percentiles de CA (A top 20 %, B 20-60 %, C reste).
create or replace view v_store_tier as
with ranked as (
  select
    s.id,
    s.tier_override,
    percent_rank() over (order by s.annual_revenue_eur desc nulls last) as pr
  from stores s
  where s.active
)
select
  r.id as store_id,
  coalesce(
    r.tier_override,
    case
      when r.pr <= (select (value->>'A')::numeric from app_settings where key = 'tier_percentiles') then 'A'
      when r.pr <= (select (value->>'B')::numeric from app_settings where key = 'tier_percentiles') then 'B'
      else 'C'
    end::tier_type
  ) as tier
from ranked r;

-- Dernière visite QUI COMPTE : faite + compte rendu soumis.
-- (Une visite déplacée ou sans compte rendu ne remet pas la dette à zéro.)
create or replace view v_store_last_visit as
select
  s.id as store_id,
  max(v.checkout_at) filter (
    where v.status = 'faite' and v.report_submitted_at is not null and v.active
  ) as last_visit_at
from stores s
left join visits v on v.store_id = s.id
where s.active
group by s.id;

-- Dette de visite + score de priorité. LE cœur du produit.
-- dette = jours_depuis_derniere_visite / frequence_cible ; > 1 = en retard.
-- score = dette × poids_tier (A=3, B=2, C=1).
-- Magasin jamais visité : dette maximale conventionnelle (2 × seuil critique du tier).
create or replace view v_store_dette as
with freq as (
  select value from app_settings where key = 'target_frequency_days'
), weights as (
  select value from app_settings where key = 'tier_weights'
)
select
  s.id as store_id,
  s.name,
  t.tier,
  coalesce(
    s.target_frequency_days_override,
    ((select value from freq)->>(t.tier::text))::int
  ) as frequence_cible_jours,
  lv.last_visit_at,
  case
    when lv.last_visit_at is null then null
    else extract(day from now() - lv.last_visit_at)::int
  end as jours_depuis_derniere_visite,
  case
    when lv.last_visit_at is null then 3.0 -- jamais visité = priorité maximale
    else round(
      (extract(epoch from now() - lv.last_visit_at) / 86400.0)
      / coalesce(s.target_frequency_days_override, ((select value from freq)->>(t.tier::text))::int),
      2
    )
  end as dette_visite,
  case
    when lv.last_visit_at is null then 3.0 * ((select value from weights)->>(t.tier::text))::numeric
    else round(
      ((extract(epoch from now() - lv.last_visit_at) / 86400.0)
       / coalesce(s.target_frequency_days_override, ((select value from freq)->>(t.tier::text))::int))
      * ((select value from weights)->>(t.tier::text))::numeric,
      2
    )
  end as score_priorite
from stores s
join v_store_tier t on t.store_id = s.id
left join v_store_last_visit lv on lv.store_id = s.id
where s.active;

-- Taux de couverture : % de magasins visités dans leur fenêtre cible sur une zone/période.
create or replace function taux_couverture(p_zone text default null)
returns numeric
language sql stable as $$
  select round(
    100.0 * count(*) filter (where d.dette_visite <= 1.0) / nullif(count(*), 0), 1
  )
  from v_store_dette d
  join stores s on s.id = d.store_id
  where p_zone is null or s.zone = p_zone
$$;

-- ============================================================
-- RLS — activée sur TOUTES les tables, sans exception
-- Un commercial ne lit que ses lignes / son périmètre. L'admin voit tout.
-- Pas de DELETE : uniquement du soft delete (active = false) via UPDATE.
-- ============================================================

alter table app_settings enable row level security;
alter table app_users enable row level security;
alter table device_sessions enable row level security;
alter table stores enable row level security;
alter table store_assignments enable row level security;
alter table routing_templates enable row level security;
alter table routing_template_stops enable row level security;
alter table routings enable row level security;
alter table visits enable row level security;
alter table incidents enable row level security;
alter table audit_log enable row level security;

-- app_settings : lecture pour tous les connectés, écriture admin.
create policy settings_read on app_settings for select to authenticated using (true);
create policy settings_write on app_settings for update to authenticated using (is_admin());

-- app_users : chacun se lit ; l'admin lit et gère tout le monde.
-- Les surnoms/couleurs des collègues sont nécessaires à l'affichage du planning → lecture élargie.
create policy users_read on app_users for select to authenticated using (true);
create policy users_admin_insert on app_users for insert to authenticated with check (is_admin());
create policy users_admin_update on app_users for update to authenticated using (is_admin());

-- device_sessions : chacun voit les siennes, l'admin voit/révoque tout.
create policy sessions_read on device_sessions for select to authenticated
  using (user_id = current_app_user_id() or is_admin());
create policy sessions_update on device_sessions for update to authenticated
  using (user_id = current_app_user_id() or is_admin());

-- stores : lecture = son périmètre, ou admin. Écriture admin.
create policy stores_read on stores for select to authenticated
  using (
    is_admin()
    or exists (
      select 1 from store_assignments a
      where a.store_id = stores.id and a.user_id = current_app_user_id()
    )
  );
create policy stores_admin_insert on stores for insert to authenticated with check (is_admin());
create policy stores_admin_update on stores for update to authenticated using (is_admin());

-- store_assignments : lecture soi/admin, écriture admin.
create policy assignments_read on store_assignments for select to authenticated
  using (user_id = current_app_user_id() or is_admin());
create policy assignments_admin_write on store_assignments for insert to authenticated with check (is_admin());
create policy assignments_admin_delete on store_assignments for delete to authenticated using (is_admin());
-- (exception au "pas de delete" : table de liaison sans historique métier, tracée par audit_log)

-- routing_templates : lecture tous connectés, écriture admin.
create policy templates_read on routing_templates for select to authenticated using (true);
create policy templates_admin_insert on routing_templates for insert to authenticated with check (is_admin());
create policy templates_admin_update on routing_templates for update to authenticated using (is_admin());

create policy template_stops_read on routing_template_stops for select to authenticated using (true);
create policy template_stops_admin_insert on routing_template_stops for insert to authenticated with check (is_admin());
create policy template_stops_admin_update on routing_template_stops for update to authenticated using (is_admin());
create policy template_stops_admin_delete on routing_template_stops for delete to authenticated using (is_admin());

-- routings : le commercial lit les siens, l'admin lit/écrit tout.
create policy routings_read on routings for select to authenticated
  using (user_id = current_app_user_id() or is_admin());
create policy routings_admin_insert on routings for insert to authenticated with check (is_admin());
create policy routings_update on routings for update to authenticated
  using (user_id = current_app_user_id() or is_admin());

-- visits : le commercial lit/met à jour LES SIENNES ; l'admin tout.
create policy visits_read on visits for select to authenticated
  using (user_id = current_app_user_id() or is_admin());
create policy visits_insert on visits for insert to authenticated
  with check (user_id = current_app_user_id() or is_admin());
create policy visits_update on visits for update to authenticated
  using (user_id = current_app_user_id() or is_admin());

-- incidents : signalement par tous sur leur périmètre, lecture périmètre/admin.
create policy incidents_read on incidents for select to authenticated
  using (
    is_admin()
    or exists (
      select 1 from store_assignments a
      where a.store_id = incidents.store_id and a.user_id = current_app_user_id()
    )
  );
create policy incidents_insert on incidents for insert to authenticated
  with check (reported_by = current_app_user_id() or is_admin());
create policy incidents_update on incidents for update to authenticated
  using (reported_by = current_app_user_id() or is_admin());

-- audit_log : lecture admin uniquement ; insertion via triggers (security definer).
create policy audit_admin_read on audit_log for select to authenticated using (is_admin());

-- ---------- Trigger d'audit générique ----------
create or replace function log_audit()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log (table_name, record_id, action, actor_id, payload)
  values (
    tg_table_name,
    coalesce(new.id, old.id),
    case
      when tg_op = 'INSERT' then 'insert'
      when tg_op = 'UPDATE' and new.active = false and old.active = true then 'soft_delete'
      else 'update'
    end,
    current_app_user_id(),
    to_jsonb(new)
  );
  return new;
end;
$$;

create trigger audit_stores after insert or update on stores
  for each row execute function log_audit();
create trigger audit_visits after insert or update on visits
  for each row execute function log_audit();
create trigger audit_incidents after insert or update on incidents
  for each row execute function log_audit();
create trigger audit_routings after insert or update on routings
  for each row execute function log_audit();
