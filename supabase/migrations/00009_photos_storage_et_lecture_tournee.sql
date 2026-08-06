-- ============================================================
-- 00009 — Stockage des photos de rayon + lecture des magasins de sa tournée
--
-- Deux corrections nécessaires au portail commercial (Lot 4) :
--   1. `visit_photos` référence un chemin Storage, mais aucun bucket n'existait :
--      l'envoi aurait échoué à la première photo ;
--   2. `stores_read` (00001) limite la lecture au périmètre d'attribution. Un
--      commercial à qui l'Admin confie une visite hors de son périmètre (rattrapage,
--      remplacement d'un collègue absent) voyait la visite sans pouvoir lire le
--      magasin : ni nom, ni adresse, ni téléphone. Écran inutilisable sur le terrain.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Bucket privé des photos de rayon
--    Privé : une photo de linéaire est une donnée client, jamais publique.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-photos', 'visit-photos', false, 600000, array['image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Le chemin d'un objet est `<visit_id>/<position>-<horodatage>.jpg` :
-- le premier segment porte l'identifiant de visite, ce qui suffit à décider.
create or replace function peut_acceder_photo(p_chemin text)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from visits v
    where v.id = nullif(split_part(p_chemin, '/', 1), '')::uuid
      and v.user_id = current_app_user_id()
  );
$$;

create policy photos_storage_read on storage.objects for select to authenticated
  using (bucket_id = 'visit-photos' and peut_acceder_photo(name));

create policy photos_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'visit-photos' and peut_acceder_photo(name));

-- Pas de policy DELETE : une photo de compte rendu ne se supprime pas
-- (règle « aucune suppression physique »). `visit_photos.active = false` suffit.

-- ------------------------------------------------------------
-- 2. Lecture d'un magasin sur lequel on a une visite
--    S'ajoute à la policy de périmètre, ne la remplace pas.
-- ------------------------------------------------------------
create policy stores_read_tournee on stores for select to authenticated
  using (
    exists (
      select 1 from visits v
      where v.store_id = stores.id
        and v.user_id = current_app_user_id()
        and v.active
    )
  );

-- ------------------------------------------------------------
-- 3. Le compte rendu doit rester lisible par son auteur après coup
--    (déjà couvert par visits_read : user_id = current_app_user_id()).
--    Rien à ajouter ici — noté pour éviter une policy en double au prochain lot.
-- ------------------------------------------------------------
