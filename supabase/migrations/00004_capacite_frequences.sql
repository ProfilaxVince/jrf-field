-- ============================================================
-- 00004 — Capacité réelle et fréquences dérivées
-- Décision utilisateur du 03/08/2026 : la fréquence cible n'est plus une valeur
-- posée a priori (14/21/42 j) mais le RÉSULTAT de la capacité disponible,
-- congés et jours fériés déduits.
--
-- Inversion du modèle :
--   avant  fréquence choisie -> dette -> alertes (permanentes si infaisable)
--   après  capacité réelle   -> fréquence atteignable -> dette -> alertes utiles
--
-- Conséquence assumée : l'outil ne peut plus afficher un objectif intenable.
-- S'il n'y a pas assez de monde, ce sont les fréquences qui s'allongent,
-- et le manque de capacité est affiché comme tel au lieu d'être déguisé
-- en retard imputé aux commerciaux.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Absences
--    Congés, maladie, formation. Une absence retire de la capacité,
--    elle ne crée aucun retard imputable.
-- ------------------------------------------------------------
create type absence_type as enum ('conges', 'maladie', 'formation', 'autre');

create table absences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users (id),
  date_debut date not null,
  date_fin date not null,
  motif absence_type not null default 'conges',
  commentaire text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (date_fin >= date_debut)
);

create index absences_user_idx on absences (user_id, date_debut, date_fin) where active;

alter table absences enable row level security;

-- Chacun voit et déclare ses absences ; l'Admin voit et gère tout le monde.
create policy absences_read on absences for select to authenticated
  using (is_admin() or user_id = current_app_user_id());
create policy absences_insert on absences for insert to authenticated
  with check (is_admin() or user_id = current_app_user_id());
create policy absences_update on absences for update to authenticated
  using (is_admin() or user_id = current_app_user_id());

-- ------------------------------------------------------------
-- 2. Jours fériés belges
--    Table, pas une règle en dur : les dates de Pâques bougent chaque année
--    et un jour de fermeture exceptionnel doit pouvoir être ajouté.
-- ------------------------------------------------------------
create table public_holidays (
  jour date primary key,
  libelle text not null
);

alter table public_holidays enable row level security;
create policy holidays_read on public_holidays for select to authenticated using (true);
create policy holidays_write on public_holidays for insert to authenticated with check (is_admin());
create policy holidays_update on public_holidays for update to authenticated using (is_admin());

insert into public_holidays (jour, libelle) values
  ('2026-01-01','Nouvel An'), ('2026-04-06','Lundi de Pâques'), ('2026-05-01','Fête du Travail'),
  ('2026-05-14','Ascension'), ('2026-05-25','Lundi de Pentecôte'), ('2026-07-21','Fête nationale'),
  ('2026-08-15','Assomption'), ('2026-11-01','Toussaint'), ('2026-11-11','Armistice'),
  ('2026-12-25','Noël'),
  ('2027-01-01','Nouvel An'), ('2027-03-29','Lundi de Pâques'), ('2027-05-01','Fête du Travail'),
  ('2027-05-06','Ascension'), ('2027-05-17','Lundi de Pentecôte'), ('2027-07-21','Fête nationale'),
  ('2027-08-15','Assomption'), ('2027-11-01','Toussaint'), ('2027-11-11','Armistice'),
  ('2027-12-25','Noël')
on conflict (jour) do nothing;

-- ------------------------------------------------------------
-- 3. Paramètres de capacité (tous modifiables depuis l'interface admin)
-- ------------------------------------------------------------
insert into app_settings (key, value) values
  ('visites_par_jour',        '2.6'::jsonb),   -- observé semaine 31 : 13 visites/semaine/personne
  ('jours_ouvres_semaine',    '5'::jsonb),
  ('reserve_urgences_pct',    '15'::jsonb),    -- capacité mise de côté pour l'imprévu
  ('montage_duree_ratio',     '0.5'::jsonb),   -- un montage de rayon coûte ~0,5 créneau de visite
  ('frequence_mode',          '"auto"'::jsonb) -- 'auto' = dérivée de la capacité | 'fixe' = valeurs saisies
on conflict (key) do nothing;

-- Qui porte des visites : les commerciaux + l'Admin (qui a aussi un portefeuille).
alter table app_users add column porte_visites boolean not null default true;

-- ------------------------------------------------------------
-- 4. Jours réellement travaillés, par personne et par semaine ISO
--    = jours ouvrés − jours fériés − jours d'absence
-- ------------------------------------------------------------
create or replace function jours_travailles(p_user uuid, p_debut date, p_fin date)
returns int language sql stable as $$
  select count(*)::int
  from generate_series(p_debut, p_fin, interval '1 day') d
  where extract(isodow from d) <= (select (value)::int from app_settings where key = 'jours_ouvres_semaine')
    and not exists (select 1 from public_holidays h where h.jour = d::date)
    and not exists (
      select 1 from absences a
      where a.user_id = p_user and a.active
        and d::date between a.date_debut and a.date_fin
    );
$$;

-- ------------------------------------------------------------
-- 5. Capacité par semaine ISO — la vue qui dit ce qui est possible
-- ------------------------------------------------------------
create or replace view v_capacite_semaine as
with semaines as (
  select
    date_trunc('week', d)::date as lundi,
    (date_trunc('week', d) + interval '6 days')::date as dimanche,
    extract(isoyear from d)::int as annee_iso,
    extract(week    from d)::int as semaine_iso
  from generate_series(
    date_trunc('year', now()) - interval '6 months',
    date_trunc('year', now()) + interval '18 months',
    interval '1 week'
  ) d
), par_personne as (
  select
    s.annee_iso, s.semaine_iso, s.lundi, s.dimanche,
    u.id as user_id, u.nickname as surnom,
    jours_travailles(u.id, s.lundi, s.dimanche) as jours
  from semaines s
  cross join app_users u
  where u.active and u.porte_visites
)
select
  annee_iso, semaine_iso, lundi, dimanche,
  count(*) filter (where jours > 0)                                     as personnes_presentes,
  sum(jours)                                                            as jours_travailles,
  round(sum(jours) * (select (value)::numeric from app_settings where key = 'visites_par_jour'), 1)
                                                                        as capacite_visites,
  round(
    sum(jours) * (select (value)::numeric from app_settings where key = 'visites_par_jour')
    * (1 - (select (value)::numeric from app_settings where key = 'reserve_urgences_pct') / 100),
    1
  )                                                                     as capacite_hors_urgences
from par_personne
group by annee_iso, semaine_iso, lundi, dimanche;

-- ------------------------------------------------------------
-- 6. Coût du montage de rayon
--    Le montage consomme de la capacité. Tant qu'il n'est pas déduit,
--    toute fréquence calculée est un mensonge.
-- ------------------------------------------------------------
create or replace view v_cout_montage_semaine as
select
  (select count(*) from stores where active and montage_rayon)                          as magasins_concernes,
  (select jsonb_array_length(value) from app_settings where key = 'montage_rayon_jours') as jours_par_semaine,
  (select count(*) from stores where active and montage_rayon)
    * (select jsonb_array_length(value) from app_settings where key = 'montage_rayon_jours')
                                                                                         as montages_par_semaine,
  round(
    (select count(*) from stores where active and montage_rayon)
    * (select jsonb_array_length(value) from app_settings where key = 'montage_rayon_jours')
    * (select (value)::numeric from app_settings where key = 'montage_duree_ratio'), 1
  )                                                                                      as creneaux_consommes;

-- ------------------------------------------------------------
-- 7. Fréquences ATTEIGNABLES, dérivées de la capacité
--    Répartition de la capacité entre tiers au prorata de (nb magasins × poids).
--    freq_tier = nb_magasins_tier × 7 / visites_hebdo_allouées_au_tier
-- ------------------------------------------------------------
create or replace view v_frequences_calculees as
with capacite as (
  -- Semaine médiane sur 12 mois glissants : ni la semaine de Noël, ni une semaine pleine.
  select percentile_cont(0.5) within group (order by capacite_hors_urgences)::numeric as capacite_mediane
  from v_capacite_semaine
  where lundi between (now() - interval '6 months')::date and (now() + interval '6 months')::date
), cout as (
  select creneaux_consommes from v_cout_montage_semaine
), dispo as (
  select greatest(c.capacite_mediane - m.creneaux_consommes, 0) as visites_hebdo,
         c.capacite_mediane,
         m.creneaux_consommes
  from capacite c cross join cout m
), parc as (
  select
    t.tier,
    count(*)::numeric as magasins,
    ((select value from app_settings where key = 'tier_weights')->>(t.tier::text))::numeric as poids
  from stores s join v_store_tier t on t.store_id = s.id
  where s.active
  group by t.tier
), poids_total as (
  select sum(magasins * poids) as total from parc
)
select
  p.tier,
  p.magasins::int,
  p.poids,
  round(d.capacite_mediane, 1)                                        as capacite_hebdo_totale,
  round(d.creneaux_consommes, 1)                                      as dont_montage_rayon,
  round(d.visites_hebdo, 1)                                           as capacite_hebdo_audits,
  round(d.visites_hebdo * (p.magasins * p.poids) / nullif(pt.total, 0), 1) as visites_hebdo_allouees,
  case
    when d.visites_hebdo * (p.magasins * p.poids) / nullif(pt.total, 0) <= 0 then null
    else round(p.magasins * 7 / (d.visites_hebdo * (p.magasins * p.poids) / pt.total), 0)
  end                                                                 as frequence_atteignable_jours,
  ((select value from app_settings where key = 'target_frequency_days')->>(p.tier::text))::int
                                                                      as frequence_souhaitee_jours,
  (d.visites_hebdo <= 0)                                              as capacite_insuffisante
from parc p
cross join poids_total pt
cross join dispo d;

-- ------------------------------------------------------------
-- 8. La dette utilise désormais la fréquence atteignable
--    Ordre de priorité : override manuel du magasin
--                     -> fréquence calculée (si frequence_mode = 'auto')
--                     -> fréquence souhaitée saisie (mode 'fixe')
-- ------------------------------------------------------------
create or replace function frequence_cible(p_store uuid)
returns int language sql stable as $$
  select coalesce(
    (select target_frequency_days_override from stores where id = p_store),
    case
      when (select value #>> '{}' from app_settings where key = 'frequence_mode') = 'auto'
      then (select frequence_atteignable_jours::int
            from v_frequences_calculees f
            join v_store_tier t on t.tier = f.tier
            where t.store_id = p_store)
      else null
    end,
    (select ((value)->>(t.tier::text))::int
     from app_settings, v_store_tier t
     where key = 'target_frequency_days' and t.store_id = p_store)
  );
$$;

create or replace view v_store_dette as
with weights as (
  select value from app_settings where key = 'tier_weights'
)
select
  s.id as store_id,
  s.name,
  t.tier,
  frequence_cible(s.id) as frequence_cible_jours,
  lv.last_visit_at,
  case when lv.last_visit_at is null then null
       else extract(day from now() - lv.last_visit_at)::int end as jours_depuis_derniere_visite,
  case
    when lv.last_visit_at is null then 3.0
    else round(
      (extract(epoch from now() - lv.last_visit_at) / 86400.0)
      / nullif(frequence_cible(s.id), 0), 2)
  end as dette_visite,
  case
    when lv.last_visit_at is null
      then 3.0 * ((select value from weights)->>(t.tier::text))::numeric
    else round(
      ((extract(epoch from now() - lv.last_visit_at) / 86400.0)
       / nullif(frequence_cible(s.id), 0))
      * ((select value from weights)->>(t.tier::text))::numeric, 2)
  end as score_priorite
from stores s
join v_store_tier t on t.store_id = s.id
left join v_store_last_visit lv on lv.store_id = s.id
where s.active;

-- ------------------------------------------------------------
-- 9. Diagnostic de faisabilité — à afficher en clair à l'Admin
--    « Il vous manque X visites par semaine » plutôt que 185 alertes rouges.
-- ------------------------------------------------------------
create or replace view v_diagnostic_capacite as
with besoin as (
  select sum(magasins * 7.0 / nullif(frequence_souhaitee_jours, 0)) as visites_hebdo_souhaitees,
         max(capacite_hebdo_audits)                                 as capacite_hebdo_audits,
         max(capacite_hebdo_totale)                                 as capacite_hebdo_totale,
         max(dont_montage_rayon)                                    as dont_montage_rayon
  from v_frequences_calculees
)
select
  round(capacite_hebdo_totale, 1)                                    as capacite_totale,
  round(dont_montage_rayon, 1)                                       as consomme_par_montage,
  round(capacite_hebdo_audits, 1)                                    as reste_pour_audits,
  round(visites_hebdo_souhaitees, 1)                                 as besoin_theorique,
  round(capacite_hebdo_audits - visites_hebdo_souhaitees, 1)         as marge,
  case
    when capacite_hebdo_audits <= 0 then 'impossible'
    when capacite_hebdo_audits < visites_hebdo_souhaitees then 'insuffisant'
    when capacite_hebdo_audits < visites_hebdo_souhaitees * 1.1 then 'tendu'
    else 'confortable'
  end                                                                as verdict
from besoin;

-- ------------------------------------------------------------
-- 10. Rythme du montage de rayon : non défini par défaut
--     Le seed marque les 95 Intermarché, mais 95 × 5 j = 475 montages/semaine
--     pour 66 créneaux disponibles : la génération automatique produirait un
--     planning absurde dès la première ouverture. Tant que l'Admin n'a pas
--     saisi le rythme réel, aucune génération n'a lieu et le diagnostic
--     de capacité reste exploitable.
-- ------------------------------------------------------------
update app_settings set value = '[]'::jsonb where key = 'montage_rayon_jours';
