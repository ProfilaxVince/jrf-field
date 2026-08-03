-- ============================================================
-- 00005 — Montage de rayon : rituel par COMMERCIAL-JOUR
-- Décision utilisateur du 03/08/2026 :
--   « 1 montage de rayon par jour par commercial, sauf urgence de livraison. »
--
-- Correction du modèle précédent (00002/00004) : le montage n'était pas
-- une propriété du magasin répétée 5 j/semaine (475/semaine, infaisable),
-- mais un créneau quotidien fixe par personne, servi en rotation sur les
-- magasins éligibles.
--
--   coût = personnes présentes × jours travaillés × 1 montage
--   et non plus  = magasins éligibles × jours
--
-- `stores.montage_rayon` change de sens : ce n'est plus « ce magasin a un
-- montage tous les jours » mais « ce magasin est ÉLIGIBLE au créneau de 6 h ».
-- ============================================================

comment on column stores.montage_rayon is
  'Magasin éligible au créneau de montage de rayon de 6 h (Intermarché à ce jour). '
  'Le montage est servi en rotation : un seul magasin par commercial et par jour.';

-- ------------------------------------------------------------
-- 1. Paramètres du rituel
-- ------------------------------------------------------------
insert into app_settings (key, value) values
  ('montages_par_jour_par_commercial', '1'::jsonb),
  ('montage_heure',                    '"06:00"'::jsonb),
  -- Coût en créneaux de visite. 0 = le montage est ANTÉRIEUR à la tournée
  -- (6 h, avant l'ouverture) et n'ampute donc pas le budget de visites :
  -- les 2,6 visites/jour observées en semaine 31 ont été mesurées dans un
  -- monde où le montage quotidien existait déjà. Le compter à nouveau
  -- reviendrait à le déduire deux fois.
  -- À passer à 0.5 si l'observation montre que le montage mange la tournée.
  ('montage_cout_creneaux',            '0'::jsonb)
on conflict (key) do update set value = excluded.value;

-- Le paramètre par magasin n'a plus de sens : la cadence est portée par la personne.
delete from app_settings where key = 'montage_rayon_jours';

-- ------------------------------------------------------------
-- 2. Coût réel du montage, recalculé sur les personnes-jours
-- ------------------------------------------------------------
-- La signature des colonnes change : on remplace la vue au lieu de la redéfinir.
drop view if exists v_cout_montage_semaine cascade;
create view v_cout_montage_semaine as
with jours as (
  -- Personnes-jours de la semaine médiane des 12 derniers mois
  select percentile_cont(0.5) within group (order by jours_travailles)::numeric as personnes_jours
  from v_capacite_semaine
  where lundi between (now() - interval '6 months')::date and (now() + interval '6 months')::date
)
select
  (select count(*) from stores where active and montage_rayon)                             as magasins_eligibles,
  (select (value)::numeric from app_settings where key = 'montages_par_jour_par_commercial') as par_commercial_par_jour,
  round(j.personnes_jours
    * (select (value)::numeric from app_settings where key = 'montages_par_jour_par_commercial'), 1)
                                                                                            as montages_par_semaine,
  round(j.personnes_jours
    * (select (value)::numeric from app_settings where key = 'montages_par_jour_par_commercial')
    * (select (value)::numeric from app_settings where key = 'montage_cout_creneaux'), 1)
                                                                                            as creneaux_consommes
from jours j;

-- Le `cascade` ci-dessus a emporté les deux vues qui en dépendent : on les
-- reconstruit à l'identique (leur logique ne change pas, seule leur source change).
create view v_frequences_calculees as
with capacite as (
  select percentile_cont(0.5) within group (order by capacite_hors_urgences)::numeric as capacite_mediane
  from v_capacite_semaine
  where lundi between (now() - interval '6 months')::date and (now() + interval '6 months')::date
), cout as (
  select creneaux_consommes from v_cout_montage_semaine
), dispo as (
  select greatest(c.capacite_mediane - m.creneaux_consommes, 0) as visites_hebdo,
         c.capacite_mediane, m.creneaux_consommes
  from capacite c cross join cout m
), parc as (
  select t.tier, count(*)::numeric as magasins,
         ((select value from app_settings where key = 'tier_weights')->>(t.tier::text))::numeric as poids
  from stores s join v_store_tier t on t.store_id = s.id
  where s.active group by t.tier
), poids_total as (
  select sum(magasins * poids) as total from parc
)
select
  p.tier, p.magasins::int, p.poids,
  round(d.capacite_mediane, 1)                                            as capacite_hebdo_totale,
  round(d.creneaux_consommes, 1)                                          as dont_montage_rayon,
  round(d.visites_hebdo, 1)                                               as capacite_hebdo_audits,
  round(d.visites_hebdo * (p.magasins * p.poids) / nullif(pt.total, 0), 1) as visites_hebdo_allouees,
  case
    when d.visites_hebdo * (p.magasins * p.poids) / nullif(pt.total, 0) <= 0 then null
    else round(p.magasins * 7 / (d.visites_hebdo * (p.magasins * p.poids) / pt.total), 0)
  end                                                                     as frequence_atteignable_jours,
  ((select value from app_settings where key = 'target_frequency_days')->>(p.tier::text))::int
                                                                          as frequence_souhaitee_jours,
  (d.visites_hebdo <= 0)                                                  as capacite_insuffisante
from parc p cross join poids_total pt cross join dispo d;

create view v_diagnostic_capacite as
with besoin as (
  select sum(magasins * 7.0 / nullif(frequence_souhaitee_jours, 0)) as visites_hebdo_souhaitees,
         max(capacite_hebdo_audits) as capacite_hebdo_audits,
         max(capacite_hebdo_totale) as capacite_hebdo_totale,
         max(dont_montage_rayon)    as dont_montage_rayon
  from v_frequences_calculees
)
select
  round(capacite_hebdo_totale, 1)                            as capacite_totale,
  round(dont_montage_rayon, 1)                               as consomme_par_montage,
  round(capacite_hebdo_audits, 1)                            as reste_pour_audits,
  round(visites_hebdo_souhaitees, 1)                         as besoin_theorique,
  round(capacite_hebdo_audits - visites_hebdo_souhaitees, 1) as marge,
  case
    when capacite_hebdo_audits <= 0 then 'impossible'
    when capacite_hebdo_audits < visites_hebdo_souhaitees then 'insuffisant'
    when capacite_hebdo_audits < visites_hebdo_souhaitees * 1.1 then 'tendu'
    else 'confortable'
  end                                                        as verdict
from besoin;

-- ------------------------------------------------------------
-- 3. Rotation : à quel rythme chaque Intermarché voit-il un montage ?
--    C'est la contrepartie du choix « 1 par personne et par jour » :
--    avec 95 magasins éligibles et ~30 montages/semaine, chaque magasin
--    est monté environ toutes les 3 semaines. À vérifier avec l'Admin.
-- ------------------------------------------------------------
create or replace view v_rotation_montage as
select
  m.magasins_eligibles,
  m.montages_par_semaine,
  case
    when m.montages_par_semaine <= 0 or m.magasins_eligibles = 0 then null
    else round(m.magasins_eligibles * 7.0 / m.montages_par_semaine, 0)
  end                                                                     as jours_entre_deux_montages,
  case
    when m.montages_par_semaine <= 0 or m.magasins_eligibles = 0 then null
    else round(m.montages_par_semaine * 52.0 / m.magasins_eligibles, 1)
  end                                                                     as montages_par_magasin_par_an
from v_cout_montage_semaine m;

-- ------------------------------------------------------------
-- 4. Urgence de livraison : elle prend la place du montage
--    Règle métier : le créneau de 6 h est le premier de la journée. Un incident
--    `oubli_livraison` de criticité 3 le remplace — il ne s'y ajoute pas, sinon
--    la journée déborde. Traçabilité : la visite de montage passe en 'annulee'
--    avec le motif, elle n'est jamais supprimée (règle : pas de suppression).
-- ------------------------------------------------------------
alter table visits
  add column remplacee_par_visite_id uuid references visits (id),
  add column motif_annulation text;

comment on column visits.remplacee_par_visite_id is
  'Montage de rayon cédé à une urgence de livraison le même matin.';

create index visits_remplacee_idx on visits (remplacee_par_visite_id)
  where remplacee_par_visite_id is not null;

-- ------------------------------------------------------------
-- 5. Suivi : combien de montages ont réellement eu lieu, et combien
--    ont sauté au profit d'une urgence.
-- ------------------------------------------------------------
create or replace view v_suivi_montage_mois as
select
  date_trunc('month', v.scheduled_date)::date                       as mois,
  count(*)                                                          as montages_planifies,
  count(*) filter (where v.status = 'faite')                        as montages_faits,
  count(*) filter (where v.remplacee_par_visite_id is not null)     as cedes_a_une_urgence,
  count(*) filter (where v.status = 'annulee'
                     and v.remplacee_par_visite_id is null)         as annules_autre_motif,
  count(distinct v.store_id)                                        as magasins_couverts,
  round(100.0 * count(*) filter (where v.status = 'faite')
        / nullif(count(*), 0), 1)                                   as taux_realisation_pct
from visits v
where v.active and v.visit_type = 'montage_rayon'
group by 1;
