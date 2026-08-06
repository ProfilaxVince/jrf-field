"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  assurerRouting,
  creerVisites,
  listAbsences,
  listHolidays,
  listVisitsPeriode,
  reordonner,
  restaurerVisites,
  retirerVisite,
  type VisitRow,
} from "@/lib/data/planning";
import { listStorePriorites, type StorePriorite } from "@/lib/data/dette";
import { listAppUsers, type AppUserRow } from "@/lib/data/users";
import { listStops } from "@/lib/data/templates";
import { ordonnerParProximite } from "@/lib/domain/planning";
import { dimancheDeLaSemaine, joursOuvres, jourISO, lundiDeLaSemaine } from "@/lib/dates";

export const MOTIF_RETRAIT = "retiré du planning par le responsable";

export type CellKey = string;
export const cellKey = (userId: string, date: string): CellKey => `${userId}__${date}`;

type Etat = {
  users: AppUserRow[];
  priorites: StorePriorite[];
  visits: VisitRow[];
  indisponibilites: Set<CellKey>;
};

const ETAT_VIDE: Etat = {
  users: [],
  priorites: [],
  visits: [],
  indisponibilites: new Set(),
};

export function usePlanningSemaine(dateReference: Date) {
  const [etat, setEtat] = useState<Etat>(ETAT_VIDE);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [dernierRemplissage, setDernierRemplissage] = useState<string[] | null>(null);
  const [dernierVidage, setDernierVidage] = useState<VisitRow[] | null>(null);

  const jours = useMemo(() => joursOuvres(dateReference).map(jourISO), [dateReference]);
  const lundi = useMemo(() => jourISO(lundiDeLaSemaine(dateReference)), [dateReference]);
  const dimanche = useMemo(() => jourISO(dimancheDeLaSemaine(dateReference)), [dateReference]);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      const [users, priorites, visits, absences, feries] = await Promise.all([
        listAppUsers(),
        listStorePriorites(),
        listVisitsPeriode(lundi, dimanche),
        listAbsences(lundi, dimanche),
        listHolidays(lundi, dimanche),
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
        visits,
        indisponibilites,
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

  /**
   * Une urgence déclarée sur le terrain arrive dans la base sans que cet écran
   * en sache rien. On recharge donc au retour sur l'onglet et au retour du
   * réseau : c'est le moment où le responsable regarde son planning, et c'est
   * là que l'écart avec la réalité se verrait.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const rafraichir = () => {
      if (document.visibilityState === "visible") void charger();
    };
    document.addEventListener("visibilitychange", rafraichir);
    window.addEventListener("online", rafraichir);
    window.addEventListener("focus", rafraichir);
    return () => {
      document.removeEventListener("visibilitychange", rafraichir);
      window.removeEventListener("online", rafraichir);
      window.removeEventListener("focus", rafraichir);
    };
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

  /** Ajoute UN magasin en fin de journée. Aucun automatisme : c'est un choix. */
  const ajouterArret = useCallback(
    async (userId: string, date: string, storeId: string, montage: boolean) => {
      setEnCours(true);
      try {
        const routingId = await assurerRouting(userId, date);
        const existantes = visitesParCellule.get(cellKey(userId, date)) ?? [];
        const position = existantes.reduce((max, v) => Math.max(max, v.position_in_day ?? 0), 0) + 1;
        const creees = await creerVisites([
          {
            store_id: storeId,
            user_id: userId,
            routing_id: routingId,
            scheduled_date: date,
            visit_type: montage ? "montage_rayon" : "conseil",
            // Le montage ouvre la journée (6 h) : il passe devant, toujours.
            position_in_day: montage ? 0 : position,
          },
        ]);
        setEtat((prev) => ({ ...prev, visits: [...prev.visits, ...creees] }));
        setDernierRemplissage(creees.map((v) => v.id));
        setErreur(null);
        return creees.length;
      } catch {
        setErreur("ajout");
        return 0;
      } finally {
        setEnCours(false);
      }
    },
    [visitesParCellule]
  );

  /** Applique un modèle de tournée à une journée, dans l'ordre du modèle. */
  const appliquerTemplate = useCallback(
    async (userId: string, date: string, templateId: string) => {
      setEnCours(true);
      try {
        const stops = await listStops(templateId);
        const key = cellKey(userId, date);
        const existantes = visitesParCellule.get(key) ?? [];
        const dejaLa = new Set(existantes.map((v) => v.store_id));
        const depart = existantes.reduce((max, v) => Math.max(max, v.position_in_day ?? 0), 0);

        const aAjouter = stops.filter((stop) => !dejaLa.has(stop.store_id));
        if (aAjouter.length === 0) return 0;

        const routingId = await assurerRouting(userId, date);
        const creees = await creerVisites(
          aAjouter.map((stop, index) => ({
            store_id: stop.store_id,
            user_id: userId,
            routing_id: routingId,
            scheduled_date: date,
            visit_type: "conseil" as const,
            position_in_day: depart + index + 1,
          }))
        );
        setEtat((prev) => ({ ...prev, visits: [...prev.visits, ...creees] }));
        setDernierRemplissage(creees.map((v) => v.id));
        setErreur(null);
        return creees.length;
      } catch {
        setErreur("ajout");
        return 0;
      } finally {
        setEnCours(false);
      }
    },
    [visitesParCellule]
  );

  /**
   * Range une journée déjà composée dans un ordre de trajet cohérent.
   * Déclenché À LA DEMANDE, jamais tout seul : le premier arrêt reste celui
   * que l'Admin a mis en tête, les suivants sont enchaînés de proche en proche.
   * Le montage de 6 h n'est pas concerné, il ouvre la journée par construction.
   */
  const rangerJournee = useCallback(
    async (userId: string, date: string) => {
      const key = cellKey(userId, date);
      const liste = (visitesParCellule.get(key) ?? []).filter(
        (v) => v.visit_type !== "montage_rayon"
      );
      if (liste.length < 2) return 0;

      const coordonnees = new Map(
        etat.priorites.map((p) => [p.store.id, { lat: p.store.lat, lng: p.store.lng }])
      );
      const ordonnes = ordonnerParProximite(
        liste.map((visit) => ({
          visit,
          ...(coordonnees.get(visit.store_id) ?? { lat: null, lng: null }),
        }))
      );
      const positions = ordonnes.map((o, index) => ({ id: o.visit.id, position: index + 1 }));
      const parId = new Map(positions.map((p) => [p.id, p.position]));
      setEtat((prev) => ({
        ...prev,
        visits: prev.visits.map((v) =>
          parId.has(v.id) ? { ...v, position_in_day: parId.get(v.id) as number } : v
        ),
      }));
      try {
        await reordonner(positions);
        return positions.length;
      } catch {
        setErreur("ordre");
        return 0;
      }
    },
    [visitesParCellule, etat.priorites]
  );

  /**
   * Vide la semaine d'UNE personne. Ne touche QUE les visites encore prévues :
   * une visite faite, reportée ou annulée est de l'historique, pas du planning —
   * un bouton « vider » ne doit jamais pouvoir effacer du travail réalisé.
   */
  const viderSemaineDe = useCallback(
    async (userId: string) => {
      const jourSet = new Set(jours);
      const aRetirer = etat.visits.filter(
        (v) => v.user_id === userId && jourSet.has(v.scheduled_date) && v.status === "planifiee"
      );
      const conservees = etat.visits.filter(
        (v) => v.user_id === userId && jourSet.has(v.scheduled_date) && v.status !== "planifiee"
      ).length;
      if (aRetirer.length === 0) return { retirees: 0, conservees };

      const ids = new Set(aRetirer.map((v) => v.id));
      setEtat((prev) => ({ ...prev, visits: prev.visits.filter((v) => !ids.has(v.id)) }));
      setDernierVidage(aRetirer);
      try {
        await Promise.all(aRetirer.map((v) => retirerVisite(v.id, MOTIF_RETRAIT)));
        setErreur(null);
      } catch {
        setEtat((prev) => ({ ...prev, visits: [...prev.visits, ...aRetirer] }));
        setDernierVidage(null);
        setErreur("vidage");
        return { retirees: 0, conservees };
      }
      return { retirees: aRetirer.length, conservees };
    },
    [etat.visits, jours]
  );

  const annulerVidage = useCallback(async () => {
    if (!dernierVidage) return;
    const rendues = dernierVidage;
    setDernierVidage(null);
    try {
      await restaurerVisites(rendues.map((v) => v.id));
      setEtat((prev) => ({ ...prev, visits: [...prev.visits, ...rendues] }));
    } catch {
      setErreur("vidage");
    }
  }, [dernierVidage]);

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
    ajouterArret,
    appliquerTemplate,
    rangerJournee,
    viderSemaineDe,
    annulerVidage,
    dernierVidage,
    oublierVidage: () => setDernierVidage(null),
    annulerRemplissage,
    oublierRemplissage: () => setDernierRemplissage(null),
    retirer,
    restaurer,
    deplacer,
    recharger: charger,
  };
}
