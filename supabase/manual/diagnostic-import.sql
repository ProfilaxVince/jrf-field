-- ============================================================
-- POURQUOI L'IMPORT DES MAGASINS ÉCHOUE — diagnostic en lecture seule
--
-- À coller dans le SQL Editor de Supabase. Ce script n'écrit RIEN :
-- il répond à trois questions, dans l'ordre où elles bloquent.
--
-- Le CSV a été rejoué ligne à ligne contre la validation de l'écran
-- d'import : 182 lignes, 0 invalide. Le refus vient donc de la base,
-- et il n'y a que trois causes possibles.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Les références du fichier sont-elles déjà prises ?
--    `stores.external_ref` est UNIQUE. Un import déjà passé (même
--    partiellement, même avec l'ancien fichier de 185 lignes) rend
--    tout nouvel import impossible : la première référence en double
--    fait échouer les 182 lignes d'un coup.
--    ⚠️ Désactiver un magasin (active = false) NE LIBÈRE PAS sa
--    référence. C'est le piège : l'écran est vide, la base non.
-- ------------------------------------------------------------
select
  count(*)                                         as refs_du_fichier_deja_en_base,
  count(*) filter (where active)                   as dont_actifs,
  count(*) filter (where not active)               as dont_desactives,
  string_agg(external_ref, ', ' order by external_ref) filter (
    where external_ref is not null
  )                                                as lesquelles
from stores
where external_ref ~ '^(ITM|ADD|PXY|DEL|SPR)-[0-9]{3}$';

-- ------------------------------------------------------------
-- 2. Suis-je bien reconnu comme Admin ?
--    La policy `stores_admin_insert` exige `is_admin()`. Si elle
--    renvoie false, l'insertion est refusée sans autre explication.
--    À exécuter DEPUIS L'APPLICATION on ne peut pas ; ici, dans le
--    SQL Editor, on vérifie au moins que le compte existe et a le rôle.
-- ------------------------------------------------------------
select
  nickname,
  full_name,
  is_admin,
  active,
  locked_until,
  case
    when not active                       then 'BLOQUANT — compte désactivé'
    when not is_admin                     then 'BLOQUANT — ce compte ne passera pas stores_admin_insert'
    when locked_until > now()             then 'BLOQUANT — compte verrouillé après 5 échecs'
    else 'OK — peut importer'
  end as verdict
from app_users
order by is_admin desc, nickname;

-- ------------------------------------------------------------
-- 3. Où en est le parc aujourd'hui ?
--    Si `fictifs_encore_actifs` n'est pas à 0, c'est que
--    remplacer-magasins-fictifs.sql n'a pas encore tourné. Ce n'est
--    pas ce qui bloque l'import, mais ça explique un écran encombré.
-- ------------------------------------------------------------
select
  count(*) filter (where active)                                        as magasins_actifs,
  count(*) filter (where active and external_ref like 'FICTIF-%')       as fictifs_encore_actifs,
  count(*) filter (where not active and external_ref like 'FICTIF-%')   as fictifs_retires,
  count(*) filter (where active and external_ref !~ '^FICTIF-')         as magasins_reels_actifs
from stores;

-- ============================================================
-- COMMENT LIRE LE RÉSULTAT
--
-- · Requête 1 renvoie 0            → les références sont libres, le
--                                    blocage est ailleurs : relancer
--                                    l'import, l'écran affiche
--                                    maintenant le message exact de
--                                    Postgres entre parenthèses.
-- · Requête 1 renvoie > 0          → l'import est déjà passé. Deux
--                                    options, au choix :
--     (a) réimporter sans la colonne « reference » du CSV ;
--     (b) libérer les références — voir le bloc commenté ci-dessous.
-- · Requête 2 : aucune ligne « OK » → se reconnecter en Gerardo.
-- ============================================================

-- ------------------------------------------------------------
-- LIBÉRER LES RÉFÉRENCES D'UN IMPORT RATÉ (à décommenter si besoin)
--
-- Ne touche QUE les magasins déjà désactivés : un magasin actif est
-- en service, on n'y touche pas. La référence part dans le nom pour
-- rester traçable, conformément à « aucune suppression physique ».
-- ------------------------------------------------------------
-- update stores
--    set external_ref = null
--  where not active
--    and external_ref ~ '^(ITM|ADD|PXY|DEL|SPR)-[0-9]{3}$';
