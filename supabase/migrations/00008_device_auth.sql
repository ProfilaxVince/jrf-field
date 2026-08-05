-- ============================================================
-- 00008 — Authentification code + PIN (retour à la décision du 02/08,
-- le magic-link Supabase testé au Lot 1 est abandonné).
--
-- RLS dépend de auth.uid() (via app_users.auth_user_id). Le code + PIN
-- ne passe pas par le flux email Supabase : chaque app_user reçoit un
-- compte auth.users « interne » (email synthétique, jamais montré),
-- et le login serveur échange code+PIN contre une vraie session Supabase
-- via admin.generateLink + verifyOtp (aucun email n'est réellement envoyé).
-- ============================================================

alter table app_users
  add column internal_auth_email text unique,
  add column failed_login_attempts int not null default 0,
  add column locked_until timestamptz;

comment on column app_users.internal_auth_email is
  'Email synthétique lié au compte auth.users interne (jamais affiché, jamais utilisé pour un vrai email).';
comment on column app_users.failed_login_attempts is
  'Compteur d''échecs PIN consécutifs, remis à 0 à la connexion réussie. Verrouillage après seuil applicatif.';
comment on column app_users.locked_until is
  'Verrouillage temporaire après trop d''échecs (rate-limit anti brute-force sur le PIN 6 chiffres).';
