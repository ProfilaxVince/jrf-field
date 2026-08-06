-- ============================================================
-- 00012 — `v_store_dette` : la fréquence cible n'est plus recalculée par magasin
--
-- Défaut trouvé au premier chargement réel (06/08/2026) : l'écran « Semaine »
-- et l'écran « À voir en priorité » dépassaient le temps limite de la base.
--
-- Cause : la vue appelait `frequence_cible(s.id)` TROIS fois par ligne
-- (colonne fréquence, dette, score). Or cette fonction déclenche à chaque appel
-- l'évaluation complète de `v_frequences_calculees`, donc de
-- `v_capacite_semaine` (≈105 semaines × 6 personnes × `jours_travailles`,
-- lui-même une boucle de 7 jours avec deux sous-requêtes) — et deux fois,
-- puisque `v_cout_montage_semaine` la réévalue de son côté.
--
--   185 magasins × 3 appels = 555 évaluations de tout l'arbre de capacité
--   pour afficher un seul écran.
--
-- La logique était juste, elle n'avait simplement jamais été exécutée sur le
-- parc entier : avec quelques magasins de test, le coût ne se voit pas.
--
-- Correctif : la fréquence atteignable ne dépend QUE du tier (3 valeurs).
-- On la lit une fois dans une CTE et on la joint, au lieu de la redemander
-- par magasin. Aucun changement de résultat, aucun changement de colonnes
-- (les vues qui en dépendent — v_frequence_reelle_magasin, v_stats_magasin_*,
-- taux_couverture — continuent de fonctionner sans être recréées).
--
-- `frequence_cible(p_store)` est conservée : elle reste juste et lisible pour
-- un magasin isolé. Elle ne doit simplement jamais être appelée en boucle.
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
-- LE point du correctif : trois lignes, calculées une seule fois pour tout le parc.
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
