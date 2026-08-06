-- ============================================================
-- 00015 — Fiche commercial : nom, prénom, e-mail, téléphone
--
-- Gérardo doit pouvoir ajouter, modifier et retirer un commercial, et garder
-- ses coordonnées quelque part d'autre que sur un post-it.
--
-- ⚠️ NE PAS CONFONDRE DEUX COLONNES QUI SE RESSEMBLENT :
--
--   · `internal_auth_email` (00008) est une adresse SYNTHÉTIQUE, unique,
--     fabriquée par l'application pour Supabase Auth. Personne ne la lit,
--     personne ne l'écrit à la main, elle ne reçoit aucun courrier.
--   · `email` (ici) est l'adresse RÉELLE du commercial. C'est une donnée de
--     fiche, purement informative. Elle NE SERT PAS à se connecter :
--     l'authentification reste surnom + code 4 chiffres (décision du 06/08).
--
-- Elle n'est donc ni unique, ni obligatoire, ni indexée. Le jour où quelqu'un
-- voudra s'en servir pour l'authentification, c'est une décision produit à
-- prendre explicitement — pas un effet de bord d'une colonne qui existait déjà.
-- ============================================================

alter table app_users
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists email      text,
  add column if not exists phone      text;

comment on column app_users.email is
  'Adresse réelle du commercial, donnée de fiche. NE SERT PAS à se connecter — voir internal_auth_email.';
comment on column app_users.phone is
  'Téléphone du commercial, donnée de fiche.';

-- ------------------------------------------------------------
-- Reprise de l'existant : `full_name` était le seul champ nominatif.
-- On le coupe au PREMIER espace — prénom d'abord, comme il a été saisi.
-- Les cas tordus (prénoms composés) se corrigeront à l'écran, un par un :
-- deviner mieux que ça sur cinq personnes ne vaut pas le code que ça coûte.
-- ------------------------------------------------------------
-- Elle ne s'exécute qu'AU PREMIER PASSAGE. Sans ce garde-fou, rejouer le
-- script re-remplirait un prénom que Gérardo vient d'effacer volontairement,
-- en le redécoupant depuis `full_name` : une donnée supprimée qui revient
-- toute seule est pire qu'une migration qui ne tourne pas.
-- Le trigger ci-dessous n'existe qu'après un premier passage : c'est le témoin.
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'app_users_compose_full_name_trg'
  ) then
    update app_users
       set first_name = split_part(trim(full_name), ' ', 1),
           last_name  = nullif(
             trim(substr(trim(full_name), strpos(trim(full_name), ' ') + 1)),
             trim(full_name)
           )
     where first_name is null
       and last_name is null;
  end if;
end $$;

-- ------------------------------------------------------------
-- `full_name` reste NOT NULL et sert d'affichage long dans tout le code
-- existant. Plutôt que de le retirer — et de toucher à chaque lecture — il est
-- désormais DÉRIVÉ : l'écran ne saisit que prénom et nom, le trigger recompose.
-- Une seule source de vérité, et aucune ligne à modifier ailleurs.
-- ------------------------------------------------------------
create or replace function app_users_compose_full_name()
returns trigger language plpgsql as $$
begin
  -- Recomposé À CHAQUE FOIS, sans condition. Ne le faire que « si un des deux
  -- champs est renseigné » laissait un `full_name` périmé derrière lui quand
  -- Gérardo effaçait le prénom ET le nom : la colonne se disait dérivée et ne
  -- l'était plus.
  new.full_name := nullif(
    trim(concat_ws(' ', nullif(trim(new.first_name), ''), nullif(trim(new.last_name), ''))),
    ''
  );
  -- Filet : `full_name` est NOT NULL. Sans prénom ni nom saisis, le surnom
  -- fait l'affaire — il est obligatoire, lui, et jamais vide.
  if new.full_name is null then
    new.full_name := new.nickname;
  end if;
  return new;
end $$;

drop trigger if exists app_users_compose_full_name_trg on app_users;
create trigger app_users_compose_full_name_trg
  before insert or update on app_users
  for each row execute function app_users_compose_full_name();

-- ------------------------------------------------------------
-- RLS : inchangée, et c'est un choix.
--   · `users_read` (00001) laisse toute personne authentifiée lire l'équipe.
--     Les commerciaux se verront donc entre eux, coordonnées comprises. Sur
--     une équipe de cinq qui se connaît, c'est le comportement attendu.
--   · `users_admin_insert` / `users_admin_update` : seul Gérardo écrit.
--     « Retirer » reste `active = false` — aucune suppression physique.
-- ------------------------------------------------------------
