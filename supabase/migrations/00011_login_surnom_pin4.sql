-- ============================================================
-- 00011 — Connexion par nom d'utilisateur + PIN 4 chiffres
--
-- Changement de contrainte demandé par l'utilisateur le 06/08/2026, en
-- remplacement de la décision du 02/08 (code 8 caractères + PIN 6 chiffres).
--
-- Ce que ça coûte, consigné pour qu'on ne le redécouvre pas plus tard :
-- le nom d'utilisateur N'EST PAS un secret (il est affiché partout dans
-- l'application). L'espace de recherche tombe de ~10^15 à 10^4. La sécurité
-- ne repose donc plus que sur le verrouillage après échecs — 5 essais puis
-- 15 minutes de blocage, soit ~20 essais/heure, ~500 heures pour épuiser
-- 10 000 combinaisons sur un compte ciblé. C'est tenable, mais ce n'est plus
-- une marge : si le verrouillage saute, le compte tombe en une nuit.
--
-- Choix d'implémentation : l'identifiant de connexion est `app_users.nickname`,
-- pas une nouvelle colonne. C'est le nom que l'équipe utilise déjà, il est
-- unique dans le parc actuel (Gerardo, Guilio, Page, Michou, Tony, Laura),
-- et ça évite d'avoir deux noms à tenir à jour pour la même personne.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Le surnom devient un identifiant : il doit être unique, sans casse.
--    Un doublon ferait échouer cette migration — c'est voulu : mieux vaut
--    un `db push` rouge qu'une connexion qui authentifie la mauvaise personne.
-- ------------------------------------------------------------
create unique index app_users_nickname_unique_idx
  on app_users (lower(nickname))
  where active;

comment on column app_users.nickname is
  'Nom d''utilisateur ET libellé affiché. Sert d''identifiant de connexion '
  '(comparé sans tenir compte de la casse), le PIN est le seul secret.';

comment on column app_users.pin_hash is
  'PIN à 4 chiffres, hashé (bcrypt). Seul facteur secret de l''authentification '
  'depuis le 06/08/2026 : le verrouillage après 5 échecs est ce qui le protège.';

-- ------------------------------------------------------------
-- 2. Les codes d'accès 8 caractères ne servent plus à rien.
--    On efface la matière : un hash de secret périmé qui traîne en base
--    n'a que des inconvénients. La colonne, elle, est conservée — la
--    supprimer imposerait de régénérer les types TypeScript, ce qui ne peut
--    pas être fait dans la même passe.
-- ------------------------------------------------------------
update app_users set access_code_hash = null where access_code_hash is not null;

comment on column app_users.access_code_hash is
  'OBSOLÈTE depuis le 06/08/2026 (connexion par nom d''utilisateur + PIN). '
  'Colonne conservée le temps d''une régénération des types, plus jamais lue ni écrite. '
  'À supprimer par une migration dédiée.';

-- ------------------------------------------------------------
-- 3. Tout le monde se reconnecte.
--    Les appareils déjà appairés gardaient une session valide indépendante
--    du PIN : les laisser ouverts, c'est laisser vivre des sessions nées
--    d'identifiants qui n'existent plus.
-- ------------------------------------------------------------
update device_sessions set revoked = true where not revoked;
