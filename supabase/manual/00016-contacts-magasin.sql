-- ============================================================
-- 00016 — Deux contacts par magasin : l'adhérent et le responsable F&L
--
-- Demande du 06/08/2026 : sur la fiche d'un magasin, Gérardo saisit le nom de
-- l'adhérent et celui du responsable fruits & légumes, chacun avec son
-- téléphone. Chaque commercial y a accès — en LECTURE SEULE (décision
-- explicite : le terrain ne modifie pas ces coordonnées).
--
-- `contact_name` / `contact_phone` existaient déjà et désignaient le CHEF DE
-- RAYON (voir le commentaire de `contact_lang` en 00001, et les en-têtes
-- acceptés à l'import : « chef_de_rayon », « responsable »). C'est donc
-- exactement le responsable fruits & légumes. On les RENOMME plutôt que d'en
-- créer de nouveaux : le renommage garde les données, alors qu'une paire de
-- colonnes en plus laisserait deux endroits où chercher le même numéro — et
-- un « contact » anonyme à côté d'un « adhérent » ne dit plus lequel est
-- lequel.
-- ============================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stores' and column_name = 'contact_name'
  ) then
    alter table stores rename column contact_name to fl_manager_name;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stores' and column_name = 'contact_phone'
  ) then
    alter table stores rename column contact_phone to fl_manager_phone;
  end if;
end $$;

alter table stores
  add column if not exists adherent_name  text,
  add column if not exists adherent_phone text;

comment on column stores.adherent_name is
  'Nom de l''adhérent (l''exploitant du point de vente).';
comment on column stores.adherent_phone is
  'Téléphone de l''adhérent.';
comment on column stores.fl_manager_name is
  'Responsable fruits & légumes — anciennement contact_name / « chef de rayon ».';
comment on column stores.fl_manager_phone is
  'Téléphone du responsable fruits & légumes.';

-- ------------------------------------------------------------
-- RLS : rien à ajouter, et c'est le point important.
--
--   · LECTURE — `stores_read_actifs` (00014) ouvre déjà tout le parc actif à
--     toute personne authentifiée. Les commerciaux voient donc les deux
--     contacts sans qu'on touche à quoi que ce soit. Les colonnes suivent la
--     table : il n'y a pas de RLS par colonne à écrire.
--   · ÉCRITURE — `stores_admin_update` (00001) exige `is_admin()`. Un
--     commercial ne peut donc PAS modifier ces coordonnées, conformément à la
--     décision du 06/08. Aucune policy à assouplir : la demande est déjà
--     satisfaite par l'existant, et l'écran terrain n'affiche aucun champ
--     modifiable.
--
-- ⚠️ RGPD : ce sont des données personnelles de tiers (employés de magasin).
--    Elles servent uniquement à joindre le magasin dans le cadre du suivi
--    commercial. Pas d'export vers un outil tiers sans y avoir réfléchi.
-- ------------------------------------------------------------

insert into supabase_migrations.schema_migrations (version, name)
values ('00016', 'contacts_magasin')
on conflict (version) do nothing;


-- ============================================================
-- Vérification — doit renvoyer les 4 colonnes, et AUCUNE colonne contact_name
-- ou contact_phone (elles ont été renommées, pas dupliquées).
-- ============================================================
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'stores'
  and column_name in ('adherent_name','adherent_phone','fl_manager_name','fl_manager_phone',
                      'contact_name','contact_phone')
order by column_name;
