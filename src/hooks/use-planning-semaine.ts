"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assurerRouting,
  creerVisites,
  listAbsences,
  listDerniersMontages,
  listHolidays,
  listVisitsPeriode,
  reordonner,
  restaurerVisites,
  retirerVisite,
  type VisitInsert,
  type VisitRow,
} from "@/lib/data/planning";
import { listStorePriorites, type StorePriorite } from "@/lib/data/dette";
import { listAssignments, type Assignment } from "@/lib/data/team";
import { listAppUsers, type AppUserRow } from "@/lib/data/users";
import { listSettings, nombre } from "@/lib/data/settings";
import { proposerSemaine, type Candidat } from "@/lib/domain/planning";
import { dimancheDeLaSemaine, joursOuvres, jourISO, lundiDeLaSemaine } from "@/lib/dates";

export const MOTIF_RETRAIT = "retiré du planning par le responsable";

export type CellKey = string;
export const cellKey = (userId: string, date: string): CellKey => `${userId}__${date}`;

type Etat = {
  users: AppUserRow[];
  priorites: StorePriorite[];
  assignments: Assignment[];
  visits: VisitRow[];
  indisponibilites: Set<CellKey>;
  visitesParJour: number;
  montagesParJour: number;
};

const ETAT_VIDE: Etat = {
  users: [],
  priorites: [],
  assignments: [],
  visits: [],
  indisponibilites: new Set(),
  visitesParJour: 0,
  montagesParJour: 0,
};

export function usePlanningSemaine(dateReference: Date) {
  const [etat, setEtat] = useState<Etat>(ETAT_VIDE);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [dernierRemplissage, setDernierRemplissage] = useState<string[] | null>(null);

  const jours = useMemo(() => joursOuvres(dateReference).map(jourISO), [dateReference]);
  const lundi = useMemo(() => jourISO(lundiDeLaSemaine(dateReference)), [dateReference]);
  const dimanche = useMemo(() => jourISO(dimancheDeLaSemaine(dateReference)), [dateReference]);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [users, priorites, assignments, visits, absences, feries, settings] = await Promise.all([
        listAppUsers(),
        listStorePriorites(),
        listAssignments(),
        listVisitsPeriode(lundi, dimanche),
        listAbsences(lundi, dimanche),
        listHolidays(lundi, dimanche),
        listSettings(),
      ]);

      const porteurs = users.filter((u) => u.porte_visites);
      const joursFeries = new Set(feries.map((f) => f.jour));
      const indisponibilites = new Set<CellKey>();
      for (const user of porteurs) {
        for (const jour of jours) {
          const absent = absences.some(
            (a) => a.user_id === user.id && a.date_debut <= jour && a.date_fin >= jour
          );
          if (absent || joursFeries.has(jour)) indisponibilites.add(cellKey(user.id, jour));
        }
      }

      setEtat({
        users: porteurs,
        priorites,
        assignments,
        visits,
        indisponibilites,
        visitesParJour: nombre(settings, "visites_par_jour", 2.6),
        montagesParJour: nombre(settings, "montages_par_jour_par_commercial", 1),
      });
      setErreur(null);
    } catch {
      setErreur("chargement");
    } finally {
      setLoading(false);
    }
  }, [lundi, dimanche, jours]);

  useEffect(() => {
    charger();
  }, [charger]);

  const visitesParCellule = useMemo(() => {
    const index = new Map<CellKey, VisitRow[]>();
    for (const visit of etat.visits) {
      const key = cellKey(visit.user_id, visit.scheduled_date);
      const liste = index.get(key);
      if (liste) liste.push(visit);
      else index.set(key, [visit]);
    }
    for (const liste of index.values()) {
      liste.sort((a, b) => (a.position_in_day ?? 0) - (b.position_in_day ?? 0));
    }
    return index;
  }, [etat.visits]);

  const remplirSemaine = useCallback(async () => {
    setEnCours(true);
    try {
      const dejaPlanifies = new Set(etat.visits.map((v) => v.store_id));
      const magasinsParUser = new Map<string, Set<string>>();
      for (const a of etat.assignments) {
        const set = magasinsParUser.get(a.user_id) ?? new Set<string>();
        set.add(a.store_id);
        magasinsParUser.set(a.user_id, set);
      }

      const derniersMontages = await listDerniersMontages();
      const ordreMontage = derniersMontages.flatMap((m) => (m.store_id ? [m.store_id] : []));
      const parStoreId = new Map(etat.priorites.map((p) => [p.store.id, p]));

      const creees: VisitRow[] = [];
      for (const user of etat.users) {
        const perimetre = magasinsParUser.get(user.id) ?? new Set<string>();
        const candidats: Candidat[] = etat.priorites
          .filter((p) => perimetre.has(p.store.id) && !dejaPlanifies.has(p.store.id))
          .map((p) => ({
            storeId: p.store.id,
            lat: p.store.lat,
            lng: p.store.lng,
            score: p.dette.score_priorite ?? 0,
          }));

        const journees = proposerSemaine({
          userId: user.id,
          jours: jours.filter((j) => !etat.indisponibilites.has(cellKey(user.id, j))),
          candidats,
          candidatsMontage: ordreMontage.filter(
            (storeId) => perimetre.has(storeId) && parStoreId.get(storeId)?.store.montage_rayon
          ),
          visitesParJour: etat.visitesParJour,
          montagesParJour: etat.montagesParJour,
        });

        for (const journee of journees) {
          const dejaPresentes = visitesParCellule.get(cellKey(user.id, journee.date)) ?? [];
          if (dejaPresentes.length > 0) continue; // journée déjà remplie : on n'y touche pas
          const routingId = await assurerRouting(user.id, journee.date);
          const lignes: VisitInsert[] = [];
          if (journee.montageStoreId) {
            lignes.push({
              store_id: journee.montageStoreId,
              user_id: user.id,
              routing_id: routingId,
              scheduled_date: journee.date,
              visit_type: "montage_rayon",
              position_in_day: 0,
            });
          }
          for (const arret of journee.arrets) {
            lignes.push({
              store_id: arret.storeId,
              user_id: user.id,
              routing_id: routingId,
              scheduled_date: journee.date,
              visit_type: "conseil",
              position_in_day: arret.position,
            });
          }
          creees.push(...(await creerVisites(lignes)));
        }
      }

      setEtat((prev) => ({ ...prev, visits: [...prev.visits, ...creees] }));
      setDernierRemplissage(creees.map((v) => v.id));
      setErreur(null);
      return creees.length;
    } catch {
      setErreur("remplissage");
      return 0;
    } finally {
      setEnCours(false);
    }
  }, [etat, jours, visitesParCellule]);

  const annulerRemplissage = useCallback(async () => {
    if (!dernierRemplissage) return;
    const ids = new Set(dernierRemplissage);
    setEtat((prev) => ({ ...prev, visits: prev.visits.filter((v) => !ids.has(v.id)) }));
    setDernierRemplissage(null);
    await Promise.all([...ids].map((id) => retirerVisite(id, MOTIF_RETRAIT))).catch(() =>
      setErreur("annulation")
    );
  }, [dernierRemplissage]);

  const retirer = useCallback(async (visit: VisitRow) => {
    setEtat((prev) => ({ ...prev, visits: prev.visits.filter((v) => v.id !== visit.id) }));
    try {
      await retirerVisite(visit.id, MOTIF_RETRAIT);
    } catch {
      setEtat((prev) => ({ ...prev, visits: [...prev.visits, visit] }));
      setErreur("retrait");
    }
  }, []);

  const restaurer = useCallback(
    async (visit: VisitRow) => {
      try {
        await restaurerVisites([visit.id]);
        setEtat((prev) => ({ ...prev, visits: [...prev.visits, visit] }));
      } catch {
        setErreur("retrait");
      }
    },
    []
  );

  /** Déplace un arrêt d'un cran dans sa journée. Enregistrement immédiat. */
  const deplacer = useCallback(
    async (visit: VisitRow, sens: -1 | 1) => {
      const key = cellKey(visit.user_id, visit.scheduled_date);
      const liste = [...(visitesParCellule.get(key) ?? [])].filter(
        (v) => v.visit_type !== "montage_rayon"
      );
      const index = liste.findIndex((v) => v.id === visit.id);
      const cible = index + sens;
      if (index < 0 || cible < 0 || cible >= liste.length) return;
      [liste[index], liste[cible]] = [liste[cible], liste[index]];

      const positions = liste.map((v, i) => ({ id: v.id, position: i + 1 }));
      const parId = new Map(positions.map((p) => [p.id, p.position]));
      setEtat((prev) => ({
        ...prev,
        visits: prev.visits.map((v) =>
          parId.has(v.id) ? { ...v, position_in_day: parId.get(v.id) as number } : v
        ),
      }));
      try {
        await reordonner(positions);
      } catch {
        setErreur("ordre");
      }
    },
    [visitesParCellule]
  );

  return {
    jours,
    users: etat.users,
    priorites: etat.priorites,
    visitesParCellule,
    indisponibilites: etat.indisponibilites,
    loading,
    erreur,
    enCours,
    dernierRemplissage,
    remplirSemaine,
    annulerRemplissage,
    oublierRemplissage: () => setDernierRemplissage(null),
    retirer,
    restaurer,
    deplacer,
    recharger: charger,
  };
}
