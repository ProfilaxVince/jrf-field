-- ============================================================
-- TERRAIN AUTONOME — à coller dans l'éditeur SQL de Supabase
--
-- Nécessaire pour que le commercial puisse composer sa propre tournée et
-- déclarer une urgence de livraison sur n'importe quel magasin.
--
-- Reprend la migration 00014. Rejouable sans risque.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tout utilisateur connecté lit le parc actif
--    L'ancienne policy de périmètre est retirée : `store_assignments` n'est
--    plus lue nulle part depuis le 06/08, la garder donnerait l'illusion
--    qu'un périmètre existe encore.
-- ------------------------------------------------------------
drop policy if exists stores_read on stores;
drop policy if exists stores_read_tournee on stores;

create policy stores_read_actifs on stores for select to authenticated
  using (active or is_admin());

comment on table stores is
  'Parc de magasins. Lecture ouverte à toute personne connectée depuis le '
  '06/08/2026 : il n''y a pas de périmètre, chaque commercial peut passer '
  'dans n''importe quel magasin. L''écriture reste réservée à l''Admin.';

-- ------------------------------------------------------------
-- 2. Le trigger d'urgence devient idempotent
--    S'il existe déjà une visite d'urgence active pour ce magasin, cette
--    personne et ce jour, on s'y rattache au lieu d'en créer une deuxième.
-- ------------------------------------------------------------
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

  -- L'application terrain a pu créer la visite avant que l'incident ne remonte
  -- (saisie hors ligne, rejouée à la reconnexion, dans l'ordre d'écriture).
  select id into v_visite_urgence
  from visits
  where store_id = new.store_id
    and user_id = new.reported_by
    and scheduled_date = v_jour
    and visit_type = 'urgence'
    and active
  limit 1;

  if v_visite_urgence is null then
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
  end if;

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

-- ------------------------------------------------------------
-- 3. Rappel : une urgence COMPTE comme une visite pleine et remet la dette
--    à zéro (décision du 03/08). `v_store_last_visit` n'exclut que le montage
--    de rayon — rien à changer, noté pour éviter une « correction » erronée.
-- ------------------------------------------------------------

insert into supabase_migrations.schema_migrations (version, name)
values ('00014', 'terrain_autonome')
on conflict (version) do nothing;


-- ============================================================
-- Vérification — doit renvoyer 2 lignes « OK »
-- ============================================================
select 'lecture du parc ouverte' as controle,
       case when exists (select 1 from pg_policies
                         where tablename = 'stores' and policyname = 'stores_read_actifs')
            then 'OK' else 'MANQUANT' end as resultat
union all
select 'urgence non dupliquée',
       case when exists (select 1 from pg_proc
                         where proname = 'incidents_urgence_remplace_montage')
            then 'OK' else 'MANQUANT' end;
