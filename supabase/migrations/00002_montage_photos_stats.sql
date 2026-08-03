-- ============================================================
-- 00002 — Montage de rayon, urgences comptées, photos, statistiques
-- Décisions utilisateur du 03/08/2026 :
--   · une urgence compte comme une visite PLEINE (remet la dette à zéro) ;
--   · le montage de rayon ne concerne que les Intermarché ;
--   · vocabulaire terrain : « montage de rayon », pas « mise en rayon ».
-- Règle inchangée : RLS sur chaque table dès sa création.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Vocabulaire : mise_en_rayon -> montage_rayon
--    (le terrain gagne ; le terme « mise en rayon » n'existe plus nulle part)
-- ------------------------------------------------------------
alter type visit_type rename value 'mise_en_rayon' to 'montage_rayon';

-- ------------------------------------------------------------
-- 2. Périmètre du montage de rayon
--    Porté par une colonne sur le magasin, pas par une règle en dur :
--    l'Admin doit pouvoir retirer un magasin sans passer par une migration.
-- ------------------------------------------------------------
alter table stores
  add column montage_rayon boolean not null default false,
  add column montage_rayon_heure time not null default '06:00';

comment on column stores.montage_rayon is
  'Le magasin fait l''objet d''un montage de rayon récurrent (Intermarché uniquement à ce jour).';

-- Magasins déjà en base au moment de la migration.
update stores set montage_rayon = true where enseigne = 'intermarche';

-- ⚠️ L'UPDATE ci-dessus ne suffit PAS : le seed et l'import CSV s'exécutent APRÈS
-- les migrations, donc leurs magasins arriveraient avec montage_rayon = false.
-- Un trigger garantit la règle quelle que soit la porte d'entrée (seed, CSV, UI).
create or replace function stores_default_montage()
returns trigger language plpgsql as $$
begin
  -- Ne s'applique qu'à l'insertion et seulement si la valeur n'a pas été fournie.
  -- Pour créer un Intermarché SANS montage de rayon : insérer puis mettre à jour.
  if new.enseigne = 'intermarche' and new.montage_rayon = false then
    new.montage_rayon := true;
  end if;
  return new;
end $$;

create trigger stores_default_montage_trg
  before insert on stores
  for each row execute function stores_default_montage();

create index stores_montage_idx on stores (montage_rayon) where montage_rayon;

-- Jours de la semaine concernés, paramétrable (1 = lundi … 7 = dimanche).
insert into app_settings (key, value) values
  ('montage_rayon_jours', '[1,2,3,4,5]'::jsonb),
  ('montage_rayon_heure_defaut', '"06:00"'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- 3. Ce qui remet la dette à zéro
--    · conseil / demo / rattrapage / urgence  -> OUI (décision : urgence = visite pleine)
--    · montage_rayon                          -> NON : rituel quotidien de service,
--      s'il comptait, les 95 Intermarché seraient éternellement à zéro de dette
--      et disparaîtraient de la priorisation. L'outil mentirait.
-- ------------------------------------------------------------
create or replace view v_store_last_visit as
select
  s.id as store_id,
  max(v.checkout_at) filter (
    where v.status = 'faite'
      and v.report_submitted_at is not null
      and v.visit_type <> 'montage_rayon'
      and v.active
  ) as last_visit_at,
  max(v.checkout_at) filter (
    where v.status = 'faite' and v.visit_type = 'montage_rayon' and v.active
  ) as last_montage_at
from stores s
left join visits v on v.store_id = s.id
where s.active
group by s.id;

-- ------------------------------------------------------------
-- 4. Photos de rayon
--    Le fichier vit dans Supabase Storage ; la base ne stocke que le chemin.
--    Compression côté client OBLIGATOIRE avant mise en file d'attente offline :
--    une photo brute de 4 Mo × 3 × 5 visites sature le cache navigateur iOS,
--    qui purge sans prévenir -> photos perdues.
-- ------------------------------------------------------------
create table visit_photos (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null references visits (id),
  storage_path text not null unique,
  caption text,
  width int,
  height int,
  bytes int check (bytes is null or bytes <= 600000), -- garde-fou : ~600 Ko après compression
  taken_at timestamptz,
  position int not null default 1 check (position between 1 and 3), -- 3 photos max par visite
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (visit_id, position)
);

create index visit_photos_visit_idx on visit_photos (visit_id) where active;

-- ------------------------------------------------------------
-- 5. Annotations structurées du compte rendu
--    `visits.report jsonb` reste le réceptacle des champs variables (Lot 4),
--    mais les deux informations que l'Admin filtre sont des colonnes réelles :
--    on ne filtre pas un parc de 185 magasins sur du JSON.
-- ------------------------------------------------------------
alter table visits
  add column notes text,                                   -- remarque libre du commercial
  add column rayon_conforme boolean;                       -- état du rayon au moment de la visite

comment on column visits.notes is
  'Remarque libre saisie sur le terrain. Reprise dans l''historique des 5 dernières visites.';

-- ------------------------------------------------------------
-- 6. RLS sur les nouvelles tables (sans exception)
-- ------------------------------------------------------------
alter table visit_photos enable row level security;

create policy photos_read on visit_photos for select to authenticated
  using (
    is_admin()
    or exists (select 1 from visits v where v.id = visit_id and v.user_id = current_app_user_id())
  );

create policy photos_insert on visit_photos for insert to authenticated
  with check (
    exists (select 1 from visits v where v.id = visit_id and v.user_id = current_app_user_id())
    or is_admin()
  );

create policy photos_update on visit_photos for update to authenticated
  using (
    is_admin()
    or exists (select 1 from visits v where v.id = visit_id and v.user_id = current_app_user_id())
  );

-- ============================================================
-- 7. STATISTIQUES — tout est calculé en SQL, le front n'agrège rien.
--    Une visite « comptée » = statut 'faite'. Le montage de rayon est
--    systématiquement isolé pour ne pas gonfler les chiffres d'audit.
-- ============================================================

-- 7.1 Activité par commercial et par mois
create or replace view v_stats_mois_commercial as
select
  date_trunc('month', v.scheduled_date)::date as mois,
  u.id as user_id,
  u.nickname as surnom,
  count(*) filter (where v.status = 'faite' and v.visit_type <> 'montage_rayon') as visites_faites,
  count(*) filter (where v.status = 'faite' and v.visit_type = 'montage_rayon')  as montages_faits,
  count(*) filter (where v.status = 'faite' and v.visit_type = 'urgence')        as urgences,
  count(*) filter (where v.status = 'faite' and v.visit_type = 'demo')           as demos,
  count(*) filter (where v.status = 'annulee')                                   as annulees,
  count(*) filter (where v.status = 'reportee')                                  as reportees,
  count(*) filter (where v.status = 'planifiee')                                 as restant_a_faire,
  round(
    100.0 * count(*) filter (where v.status = 'faite')
    / nullif(count(*) filter (where v.status <> 'annulee'), 0), 1
  ) as taux_realisation_pct,
  count(distinct v.store_id) filter (
    where v.status = 'faite' and v.visit_type <> 'montage_rayon'
  ) as magasins_distincts
from visits v
join app_users u on u.id = v.user_id
where v.active
group by 1, 2, 3;

-- 7.2 Même chose à l'année
create or replace view v_stats_annee_commercial as
select
  date_trunc('year', v.scheduled_date)::date as annee,
  u.id as user_id,
  u.nickname as surnom,
  count(*) filter (where v.status = 'faite' and v.visit_type <> 'montage_rayon') as visites_faites,
  count(*) filter (where v.status = 'faite' and v.visit_type = 'montage_rayon')  as montages_faits,
  count(distinct v.store_id) filter (
    where v.status = 'faite' and v.visit_type <> 'montage_rayon'
  )                                                                              as magasins_distincts,
  round(
    100.0 * count(*) filter (where v.status = 'faite')
    / nullif(count(*) filter (where v.status <> 'annulee'), 0), 1
  ) as taux_realisation_pct
from visits v
join app_users u on u.id = v.user_id
where v.active
group by 1, 2, 3;

-- 7.3 Fréquence réelle par magasin, comparée à la fréquence cible.
--     C'est la vue qui répond à « est-ce qu'on tient nos engagements ? ».
create or replace view v_frequence_reelle_magasin as
with faites as (
  select
    v.store_id,
    v.checkout_at,
    lag(v.checkout_at) over (partition by v.store_id order by v.checkout_at) as precedente
  from visits v
  where v.active and v.status = 'faite'
    and v.report_submitted_at is not null
    and v.visit_type <> 'montage_rayon'
), intervalles as (
  select store_id,
         extract(epoch from checkout_at - precedente) / 86400.0 as jours
  from faites
  where precedente is not null
)
select
  d.store_id,
  d.name,
  d.tier,
  d.frequence_cible_jours,
  count(i.jours)                       as nb_intervalles,
  round(avg(i.jours)::numeric, 1)      as frequence_reelle_jours,
  round(max(i.jours)::numeric, 1)      as pire_intervalle_jours,
  round(
    (avg(i.jours) - d.frequence_cible_jours)::numeric, 1
  )                                    as ecart_jours          -- > 0 = on visite moins souvent que prévu
from v_store_dette d
left join intervalles i on i.store_id = d.store_id
group by d.store_id, d.name, d.tier, d.frequence_cible_jours;

-- 7.4 Couverture mensuelle : part du parc réellement vue dans le mois
create or replace view v_couverture_mensuelle as
with mois as (
  select distinct date_trunc('month', v.scheduled_date)::date as mois
  from visits v where v.active
)
select
  m.mois,
  (select count(*) from stores where active)                                    as parc,
  count(distinct v.store_id) filter (where v.status = 'faite')                  as magasins_vus,
  round(
    100.0 * count(distinct v.store_id) filter (where v.status = 'faite')
    / nullif((select count(*) from stores where active), 0), 1
  )                                                                             as couverture_pct,
  count(*) filter (where v.status = 'faite' and v.visit_type <> 'montage_rayon') as visites_faites
from mois m
left join visits v
  on date_trunc('month', v.scheduled_date)::date = m.mois
 and v.active and v.visit_type <> 'montage_rayon'
group by m.mois;

-- 7.5 Photo de l'état du parc à l'instant T, par enseigne et par région
create or replace view v_stats_parc as
select
  s.enseigne,
  s.region,
  d.tier,
  count(*)                                              as magasins,
  count(*) filter (where d.dette_visite > 1.0)          as en_retard,
  count(*) filter (where d.dette_visite > 1.5)          as urgents,
  count(*) filter (where d.last_visit_at is null)       as jamais_vus,
  round(avg(d.dette_visite), 2)                         as dette_moyenne
from v_store_dette d
join stores s on s.id = d.store_id
group by s.enseigne, s.region, d.tier;

-- 7.6 Incidents : volume, criticité, délai de résolution
create or replace view v_stats_incidents_mois as
select
  date_trunc('month', i.created_at)::date as mois,
  i.incident_type,
  i.criticality,
  count(*)                                                             as total,
  count(*) filter (where i.status = 'resolu')                          as resolus,
  count(*) filter (where i.status <> 'resolu')                         as ouverts,
  round(avg(extract(epoch from i.resolved_at - i.created_at) / 3600.0)::numeric, 1)
                                                                       as delai_resolution_heures
from incidents i
where i.active
group by 1, 2, 3;

-- 7.7 Charge de travail : visites planifiées par semaine ISO et par commercial.
--     Sert à détecter la surcharge AVANT qu'elle produise des retards.
create or replace view v_charge_semaine as
select
  extract(isoyear from v.scheduled_date)::int as annee_iso,
  extract(week    from v.scheduled_date)::int as semaine_iso,
  u.id as user_id,
  u.nickname as surnom,
  count(*) filter (where v.visit_type <> 'montage_rayon') as visites_planifiees,
  count(*) filter (where v.visit_type = 'montage_rayon')  as montages_planifies
from visits v
join app_users u on u.id = v.user_id
where v.active and v.status in ('planifiee', 'faite')
group by 1, 2, 3, 4;
