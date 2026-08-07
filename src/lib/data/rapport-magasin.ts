"use client";
/**
 * Lecture unique qui alimente le rapport d'un magasin : la page imprimable et
 * l'export tableur partent du même objet.
 *
 * Tout est lu d'un coup, pour un seul magasin — le patron est devant
 * l'adhérent, il n'a pas le temps d'attendre une deuxième requête.
 */
import { supabase } from "./supabase";
import { listAppUsers } from "./users";
import { formatDate } from "../dates";
import { t } from "../i18n/fr-BE";
import {
  frequenceMoyenne,
  grouperIncidents,
  type RapportMagasin,
} from "../domain/rapport-magasin";
import type { StoreRow } from "./stores";

const LIBELLE_TYPE: Record<string, string> = {
  conseil: t.planning.typeVisite,
  montage_rayon: t.planning.typeMontage,
  demo: t.planning.typeDemo,
  depannage: t.planning.typeDepannage,
  urgence: t.planning.typeUrgence,
  rattrapage: t.planning.typeRattrapage,
};

/** Une visite ne figure au rapport que si elle a EU LIEU. */
const STATUT_COMPTE = "faite";

export async function chargerRapportMagasin(
  storeId: string,
  mois: number
): Promise<RapportMagasin> {
  const depuis = new Date();
  depuis.setMonth(depuis.getMonth() - mois);
  const debut = depuis.toISOString().slice(0, 10);
  const fin = new Date().toISOString().slice(0, 10);

  const [magasin, visites, incidents, dette, exercices, users] = await Promise.all([
    supabase.from("stores").select("*").eq("id", storeId).single(),
    supabase
      .from("visits")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", STATUT_COMPTE)
      .eq("active", true)
      .gte("scheduled_date", debut)
      .lte("scheduled_date", fin)
      .order("scheduled_date", { ascending: false }),
    supabase
      .from("incidents")
      .select("*")
      .eq("store_id", storeId)
      .eq("active", true)
      .gte("created_at", debut)
      .order("created_at", { ascending: false }),
    supabase.from("v_store_dette").select("*").eq("store_id", storeId).maybeSingle(),
    supabase
      .from("v_store_revenue_evolution")
      .select("*")
      .eq("store_id", storeId)
      .order("exercice", { ascending: false }),
    listAppUsers(),
  ]);

  if (magasin.error) throw magasin.error;
  if (visites.error) throw visites.error;
  if (incidents.error) throw incidents.error;

  const s = magasin.data as StoreRow;
  const surnom = new Map(users.map((u) => [u.id, u.nickname]));

  const dates = [...(visites.data ?? [])]
    .map((v) => v.scheduled_date)
    .sort((a, b) => a.localeCompare(b));

  const lignesIncidents = (incidents.data ?? []).map((i) => ({
    date: formatDate(i.created_at),
    type: t.incidents.types[i.incident_type] ?? i.incident_type,
    criticite: i.criticality,
    statut: t.incidents.statuts[i.status] ?? i.status,
    description: i.description ?? "",
  }));

  return {
    magasin: {
      nom: s.name,
      enseigne: t.stores.enseigneLabels[s.enseigne] ?? s.enseigne,
      adresse: s.address ?? "",
      codePostal: s.postal_code ?? "",
      ville: s.city,
      adherent: s.adherent_name ?? "",
      adherentTel: s.adherent_phone ?? "",
      responsableFl: s.fl_manager_name ?? "",
      responsableFlTel: s.fl_manager_phone ?? "",
    },
    periode: { du: formatDate(debut), au: formatDate(fin), mois },
    resume: {
      visites: visites.data?.length ?? 0,
      derniereVisite: dates.length ? formatDate(dates[dates.length - 1]) : null,
      frequenceMoyenneJours: frequenceMoyenne(dates),
      frequencePrevueJours: dette.data?.frequence_cible_jours ?? null,
      incidents: lignesIncidents.length,
    },
    visites: (visites.data ?? []).map((v) => ({
      date: formatDate(v.scheduled_date),
      commercial: surnom.get(v.user_id) ?? "",
      type: LIBELLE_TYPE[v.visit_type] ?? v.visit_type,
      rayonConforme: v.rayon_conforme,
      remarque: v.notes ?? "",
      motif: v.motif_depannage ?? "",
    })),
    incidentsParType: grouperIncidents(lignesIncidents),
    incidents: lignesIncidents,
    exercices: (exercices.data ?? []).map((e) => ({
      annee: e.exercice ?? 0,
      montant: Number(e.montant ?? 0),
      ecartPct: e.ecart_pct === null ? null : Number(e.ecart_pct),
    })),
  };
}
