-- ============================================================
-- 00017 — Dépannage, y compris le samedi et le dimanche
--
-- Demande du 06/08/2026 : il arrive — rarement — qu'un commercial dépanne un
-- magasin le week-end. Gérardo doit pouvoir le planifier, le commercial doit
-- pouvoir l'ajouter lui-même, et la RAISON doit être écrite.
--
-- Ce que cette migration NE fait pas, et pourquoi :
--
--   · aucune policy à ouvrir. `visits_insert` (00001) autorise déjà
--     `user_id = current_app_user_id()`, sans aucune contrainte de date. Un
--     commercial peut donc créer sa visite un dimanche depuis toujours :
--     c'est l'écran qui ne le proposait pas, pas la base qui l'interdisait.
--     Ajouter une policy « week-end » ici donnerait l'illusion d'un verrou
--     qui n'a jamais existé.
--
--   · rien sur la dette de visite. `v_store_last_visit` n'exclut que le
--     montage de rayon : un dépannage comptera donc comme une visite pleine
--     et remettra la dette à zéro, exactement comme l'urgence de livraison
--     (décision du 03/08). C'est voulu — le commercial s'est déplacé, le
--     magasin a été vu.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Le type de visite.
--    `alter type ... add value` ne peut pas tourner dans une transaction en
--    Postgres < 12, et surtout la nouvelle valeur n'est pas utilisable dans
--    la même transaction que sa création. Le `do` séparé évite les deux
--    pièges et rend le script rejouable.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'visit_type' and e.enumlabel = 'depannage'
  ) then
    alter type visit_type add value 'depannage';
  end if;
end $$;

-- ------------------------------------------------------------
-- 2. La raison du dépannage.
--    Colonne dédiée plutôt que `notes` : `notes` est la remarque libre du
--    compte rendu, écrite APRÈS la visite. Le motif, lui, existe avant — c'est
--    ce qui justifie le déplacement. Les mélanger, c'est perdre la raison dès
--    que quelqu'un rédige son compte rendu.
-- ------------------------------------------------------------
alter table visits add column if not exists motif_depannage text;

comment on column visits.motif_depannage is
  'Pourquoi ce dépannage a lieu. Obligatoire pour un visit_type = depannage.';

-- ------------------------------------------------------------
-- 3. Un dépannage SANS motif est refusé par la base.
--
--    ⚠️ Le `::text` n'est pas cosmétique. Postgres interdit d'UTILISER une
--    valeur d'enum dans la transaction qui vient de la créer : écrire
--    `visit_type = 'depannage'` ici ferait échouer tout le script collé d'un
--    bloc, avec « unsafe use of new value of enum type ». Comparer le libellé
--    en texte contourne la règle sans la violer, et Gérardo colle tout d'un
--    coup — c'est la seule façon dont il exécute du SQL.
--
--    La contrainte est écrite NOT VALID puis validée : elle s'applique à
--    toute nouvelle ligne sans exiger que l'historique soit conforme. Aucune
--    visite passée n'est un dépannage, mais le jour où on ajoutera un type,
--    ce script ne bloquera pas sur des données anciennes.
-- ------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'visits_depannage_motif_requis'
  ) then
    alter table visits add constraint visits_depannage_motif_requis
      check (
        visit_type::text <> 'depannage'
        or (motif_depannage is not null and length(trim(motif_depannage)) > 0)
      ) not valid;
    alter table visits validate constraint visits_depannage_motif_requis;
  end if;
end $$;
