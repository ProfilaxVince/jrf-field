-- ============================================================
-- INSTALLATION SANS TERMINAL — à coller dans l'éditeur SQL de Supabase
--
-- Ce fichier reprend les migrations 00009, 00010 et 00011 pour les cas où
-- `supabase db push` n'est pas disponible (poste bridé, pas d'accès CLI).
--
-- Il est ÉCRIT POUR ÊTRE RELANCÉ SANS RISQUE : si une exécution s'arrête au
-- milieu, on peut tout recoller et relancer. Chaque objet est supprimé avant
-- d'être recréé, aucune donnée métier n'est touchée.
--
-- ⚠️ Ce fichier ne contient AUCUN code d'accès. L'attribution du code se fait
-- dans un second temps (voir `code-acces.sql`), et ne doit jamais être
-- enregistrée comme snippet dans Supabase.
-- ============================================================


-- ============================================================
-- 00009 — Photos de rayon : bucket de stockage + lecture des magasins
--         de sa tournée
-- ============================================================

-- Bucket privé : une photo de linéaire est une donnée client, jamais publique.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-photos', 'visit-photos', false, 600000, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Le chemin d'un objet est `<visit_id>/<position>-<horodatage>.jpg` : le
-- premier segment porte l'identifiant de visite. Il est validé AVANT d'être
-- casté — un chemin fabriqué à la main doit être refusé, pas planter.
create or replace function peut_acceder_photo(p_chemin text)
returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when split_part(p_chemin, '/', 1) !~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then false
    when is_admin() then true
    else exists (
      select 1 from visits v
      where v.id = split_part(p_chemin, '/', 1)::uuid
        and v.user_id = current_app_user_id()
    )
  end;
$$;

drop policy if exists photos_storage_read on storage.objects;
create policy photos_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'visit-photos' and peut_acceder_photo(name));

drop policy if exists photos_storage_insert on storage.objects;
create policy photos_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'visit-photos' and peut_acceder_photo(name));

-- Pas de policy DELETE : une photo de compte rendu ne se supprime pas.

-- Un commercial à qui l'Admin confie une visite hors de son périmètre
-- (rattrapage, remplacement) doit pouvoir lire le magasin : sans ça, ni nom,
-- ni adresse, ni téléphone sur le terrain.
drop policy if exists stores_read_tournee on stores;
create policy stores_read_tournee on stores for select to authenticated
  using (
    exists (
      select 1 from visits v
      where v.store_id = stores.id
        and v.user_id = current_app_user_id()
        and v.active
    )
  );


-- ============================================================
-- 00010 — L'urgence de livraison prend la place du montage de 6 h
-- ============================================================

create or replace function incidents_urgence_remplace_montage()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_jour date := (new.created_at at time zone 'Europe/Brussels')::date;
  v_visite_urgence uuid;
  v_routing uuid;
begin
  if new.incident_type <> 'oubli_livraison' or new.criticality < 3 then
    return new;
  end if;

  select id into v_routing
  from routings
  where user_id = new.reported_by and date = v_jour;

  if v_routing is null then
    insert into routings (user_id, date) values (new.reported_by, v_jour)
    returning id into v_routing;
  end if;

  insert into visits (
    store_id, user_id, routing_id, scheduled_date, visit_type, status, position_in_day
  )
  values (
    new.store_id, new.reported_by, v_routing, v_jour, 'urgence', 'planifiee', 0
  )
  returning id into v_visite_urgence;

  -- Le créneau de 6 h est le premier de la journée : l'urgence le remplace,
  -- elle ne s'y ajoute pas, sinon la journée déborde.
  update visits
     set status = 'annulee',
         remplacee_par_visite_id = v_visite_urgence,
         motif_annulation = 'montage cédé à une urgence de livraison'
   where user_id = new.reported_by
     and scheduled_date = v_jour
     and visit_type = 'montage_rayon'
     and status = 'planifiee'
     and active;

  update incidents set linked_visit_id = v_visite_urgence where id = new.id;

  return new;
end $$;

drop trigger if exists incidents_urgence_trg on incidents;
create trigger incidents_urgence_trg
  after insert on incidents
  for each row execute function incidents_urgence_remplace_montage();


-- ============================================================
-- 00011 — Connexion par nom d'utilisateur + code à 4 chiffres
-- ============================================================

-- Le surnom devient un identifiant : il doit être unique, sans tenir compte
-- de la casse. Un doublon fait échouer cette ligne — c'est voulu : mieux vaut
-- une erreur ici qu'une connexion qui authentifie la mauvaise personne.
create unique index if not exists app_users_nickname_unique_idx
  on app_users (lower(nickname))
  where active;

comment on column app_users.nickname is
  'Nom d''utilisateur ET libellé affiché. Sert d''identifiant de connexion '
  '(comparé sans tenir compte de la casse), le code à 4 chiffres est le seul secret.';

comment on column app_users.pin_hash is
  'Code à 4 chiffres, hashé (bcrypt). Seul facteur secret de l''authentification '
  'depuis le 06/08/2026 : le verrouillage après 5 échecs est ce qui le protège.';

-- Les codes d'accès 8 caractères ne servent plus : on efface la matière.
update app_users set access_code_hash = null where access_code_hash is not null;

comment on column app_users.access_code_hash is
  'OBSOLÈTE depuis le 06/08/2026 (connexion par nom d''utilisateur + code). '
  'Colonne conservée le temps d''une régénération des types, plus jamais lue ni écrite.';

-- Une session d'appareil née d'identifiants qui n'existent plus n'a pas à survivre.
update device_sessions set revoked = true where not revoked;


-- ============================================================
-- Enregistrement des migrations
-- Sans ces lignes, un futur `supabase db push` tenterait de rejouer ces
-- trois fichiers et échouerait sur des objets déjà créés.
-- ============================================================
insert into supabase_migrations.schema_migrations (version, name)
values
  ('00009', 'photos_storage_et_lecture_tournee'),
  ('00010', 'urgence_remplace_montage'),
  ('00011', 'login_surnom_pin4')
on conflict (version) do nothing;


-- ============================================================
-- Vérification — doit renvoyer 3 lignes « OK »
-- ============================================================
select 'bucket photos' as controle,
       case when exists (select 1 from storage.buckets where id = 'visit-photos')
            then 'OK' else 'MANQUANT' end as resultat
union all
select 'règle urgence livraison',
       case when exists (select 1 from pg_trigger where tgname = 'incidents_urgence_trg')
            then 'OK' else 'MANQUANT' end
union all
select 'noms d''utilisateur uniques',
       case when exists (select 1 from pg_indexes where indexname = 'app_users_nickname_unique_idx')
            then 'OK' else 'MANQUANT' end;
