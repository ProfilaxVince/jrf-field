-- ============================================================
-- 00020 — Une visite importée COMPTE comme une visite faite
--
-- Défaut constaté par Vincent le 07/08/2026, au premier import réel : les
-- passages importés apparaissaient encore comme « à faire » et le magasin
-- restait en tête des priorités, alors que le commercial y était passé.
--
-- Cause. Trois vues exigent `report_submitted_at is not null` pour qu'une
-- visite remette la dette à zéro. C'était juste tant que la seule façon de
-- terminer une visite était de rédiger son compte rendu dans l'application :
-- « faite sans compte rendu » signifiait alors « pas vraiment faite ».
--
-- Une visite reconstituée depuis le fichier de l'informatique n'a PAS de
-- compte rendu, n'en aura jamais, et n'en a pas besoin : le commercial a
-- pointé son passage dans Odoo. Elle était donc parfaitement invisible pour
-- le cœur du produit.
--
-- Ce qu'on ne fait PAS, et pourquoi : poser `report_submitted_at` à
-- l'import. Ce serait la solution d'une ligne, mais elle affirmerait qu'un
-- compte rendu a été soumis — et ferait apparaître dans l'écran « Comptes
-- rendus » des visites au compte rendu vide. Une donnée qui ment pour faire
-- marcher une vue finit toujours par ressortir ailleurs.
--
-- Deuxième correction, du même ordre : la dette se date sur `checkout_at`.
-- Quand le fichier ne porte pas d'heure de départ — la question A4 posée à
-- l'informatique — cette colonne est vide, `max()` renvoie NULL, et la visite
-- ne date rien du tout. On retombe donc sur le JOUR de la visite, à midi
-- heure belge : midi et non minuit, pour qu'aucun décalage de fuseau ne
-- rejette la visite sur la veille.
-- ============================================================

-- ------------------------------------------------------------
-- Une visite « aboutie » : faite, et soit son compte rendu est soumis, soit
-- elle vient d'un autre système où le passage a déjà été pointé.
-- ------------------------------------------------------------
create or replace function visite_aboutie(
  p_status visit_status, p_report_submitted_at timestamptz, p_source text
) returns boolean
language sql immutable as $$
  select p_status = 'faite'
     and (p_report_submitted_at is not null or p_source is not null)
$$;

comment on function visite_aboutie is
  'Une visite compte quand elle est faite ET qu''elle porte soit un compte rendu, '
  'soit une provenance externe (import). Centralisé ici pour que les vues ne '
  'divergent plus : elles étaient trois à répéter la même condition.';

-- ------------------------------------------------------------
-- L'instant qui DATE la visite. `checkout_at` quand on l'a, sinon le jour de
-- la visite à midi, heure de Bruxelles.
-- ------------------------------------------------------------
create or replace function visite_instant(
  p_checkout_at timestamptz, p_scheduled_date date
) returns timestamptz
language sql immutable as $$
  select coalesce(
    p_checkout_at,
    (p_scheduled_date + time '12:00') at time zone 'Europe/Brussels'
  )
$$;

-- ------------------------------------------------------------
-- 1. Dernière visite qui compte
-- ------------------------------------------------------------
create or replace view v_store_last_visit as
select
  s.id as store_id,
  max(visite_instant(v.checkout_at, v.scheduled_date)) filter (
    where visite_aboutie(v.status, v.report_submitted_at, v.source)
      and v.visit_type <> 'montage_rayon'
      and v.active
  ) as last_visit_at,
  max(visite_instant(v.checkout_at, v.scheduled_date)) filter (
    where v.status = 'faite' and v.visit_type = 'montage_rayon' and v.active
  ) as last_montage_at
from stores s
left join visits v on v.store_id = s.id
where s.active
group by s.id;

-- ------------------------------------------------------------
-- 2. Fréquence réelle : mêmes visites, même règle.
-- ------------------------------------------------------------
create or replace view v_frequence_reelle_magasin as
with faites as (
  select
    v.store_id,
    visite_instant(v.checkout_at, v.scheduled_date) as fait_le,
    lag(visite_instant(v.checkout_at, v.scheduled_date))
      over (partition by v.store_id order by visite_instant(v.checkout_at, v.scheduled_date))
      as precedente
  from visits v
  where v.active
    and visite_aboutie(v.status, v.report_submitted_at, v.source)
    and v.visit_type <> 'montage_rayon'
), intervalles as (
  select store_id,
         extract(epoch from fait_le - precedente) / 86400.0 as jours
  from faites
  where precedente is not null
)
-- ⚠️ Toutes les colonnes d'origine, dans l'ordre : `create or replace view`
-- refuse d'en retirer une, et `pire_intervalle_jours` est lue par l'écran
-- Chiffres. Un `drop view` à la place ferait tomber `v_store_dette` avec elle.
select
  d.store_id,
  d.name,
  d.tier,
  d.frequence_cible_jours,
  count(i.jours)                                        as nb_intervalles,
  round(avg(i.jours)::numeric, 1)                       as frequence_reelle_jours,
  round(max(i.jours)::numeric, 1)                       as pire_intervalle_jours,
  round((avg(i.jours) - d.frequence_cible_jours)::numeric, 1) as ecart_jours
from v_store_dette d
left join intervalles i on i.store_id = d.store_id
group by d.store_id, d.name, d.tier, d.frequence_cible_jours;
