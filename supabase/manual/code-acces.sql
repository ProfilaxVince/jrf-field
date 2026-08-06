-- ============================================================
-- DONNER UN CODE À 4 CHIFFRES — sans terminal
--
-- À exécuter APRÈS `installation-navigateur.sql`, et APRÈS avoir créé le
-- compte technique correspondant dans Supabase :
--   Authentication → Users → Add user
--     · Email        : gerardo@device.jrf-field.internal
--     · Password     : n'importe quoi de long (il ne sert JAMAIS à se connecter)
--     · Auto Confirm User : coché
--
-- Pourquoi un email bidon : la connexion se fait par nom d'utilisateur + code,
-- mais Supabase a besoin d'un compte interne pour que les règles de sécurité
-- (RLS) sachent qui parle. Cet email n'est jamais affiché et ne reçoit rien.
--
-- ⚠️ Ce fichier est un MODÈLE. Il ne contient aucun code réel et ne doit
-- jamais être enregistré rempli : remplace les deux valeurs ci-dessous
-- au moment de l'exécution, lance, puis referme sans sauvegarder le snippet.
-- ============================================================

-- pgcrypto fournit le hachage bcrypt, le même format que celui vérifié par
-- l'application. Le code n'est donc jamais stocké en clair.
create extension if not exists pgcrypto with schema extensions;

update app_users
   set auth_user_id = (
         select id from auth.users
         where email = 'gerardo@device.jrf-field.internal'   -- ← l'email créé juste avant
       ),
       internal_auth_email = 'gerardo@device.jrf-field.internal',
       pin_hash = extensions.crypt('1969', extensions.gen_salt('bf', 10)),  -- ← le code à 4 chiffres
       access_code_hash = null,
       failed_login_attempts = 0,
       locked_until = null
 where lower(nickname) = lower('Gerardo')                     -- ← le nom d'utilisateur
   and active;


-- ============================================================
-- Vérification — doit renvoyer UNE ligne, avec « prêt » partout
-- ============================================================
select nickname                                   as nom_utilisateur,
       case when auth_user_id is null then 'MANQUE le compte technique' else 'prêt' end as compte,
       case when pin_hash    is null then 'MANQUE le code'              else 'prêt' end as code,
       case when locked_until is null then 'prêt' else 'VERROUILLÉ'     end             as acces
  from app_users
 where lower(nickname) = lower('Gerardo');
