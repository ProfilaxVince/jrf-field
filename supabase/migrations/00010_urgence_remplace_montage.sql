-- ============================================================
-- 00010 — L'urgence de livraison prend la place du montage de 6 h
--
-- La règle a été décidée le 03/08 et le schéma l'a préparée
-- (`visits.remplacee_par_visite_id`, `motif_annulation`), mais rien ne
-- l'appliquait : c'était resté une intention.
--
-- Choix d'implémentation : un TRIGGER sur `incidents`, pas un appel côté front.
--   · la règle vaut quelle que soit la porte d'entrée (terrain, admin, import) ;
--   · elle survit au mode hors-ligne : un incident rejoué à la reconnexion
--     déclenche exactement le même enchaînement, à sa date réelle (`created_at`,
--     porté par le client quand la saisie a eu lieu sans réseau) ;
--   · le front n'a aucune logique métier à connaître.
--
-- Ce que fait le trigger, pour un incident `oubli_livraison` de criticité 3 :
--   1. crée une visite `urgence` le jour de l'incident, pour la personne qui
--      signale, en tête de journée (position 0) ;
--   2. passe SON montage de rayon du jour en `annulee` — jamais supprimé —
--      avec le motif et le lien vers la visite qui l'a remplacé ;
--   3. rattache l'incident à la visite créée (`linked_visit_id`).
--
-- Rappel des conséquences (décisions du 03/08) : une urgence compte comme une
-- visite pleine et remet la dette à zéro ; le montage annulé, lui, n'aurait de
-- toute façon jamais remis la dette à zéro.
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

  -- Tournée du jour de la personne qui signale (créée si elle n'existe pas :
  -- une urgence peut tomber un jour sans tournée planifiée).
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

create trigger incidents_urgence_trg
  after insert on incidents
  for each row execute function incidents_urgence_remplace_montage();

-- ------------------------------------------------------------
-- Remontées à la centrale : PAS de vue dédiée.
-- L'information est déjà dans `visits` (colonne `relais_centrale` + message
-- dans le compte rendu) : une vue n'apporterait aucune agrégation, seulement
-- un filtre — que la lecture client fait aussi bien, sans imposer une
-- régénération des types pour un simple `select`.
-- ------------------------------------------------------------
