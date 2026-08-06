/**
 * Heuristique de tournée — calculs PURS, aucun accès réseau.
 *
 * Règle du projet : pas de solveur VRP. Plus proche voisin + réordonnancement
 * manuel, point. Le but n'est pas l'itinéraire optimal, c'est une journée
 * géographiquement cohérente que l'Admin peut corriger en deux clics.
 *
 * Choix de la journée :
 *   1. le magasin qui attend le plus (score de priorité calculé en SQL) ouvre la journée ;
 *   2. les arrêts suivants sont les PLUS PROCHES parmi les magasins encore
 *      prioritaires — pas parmi tout le parc, sinon la tournée se remplirait de
 *      voisins qui n'ont rien demandé pendant que les vrais retards attendent.
 */

export type Candidat = {
  storeId: string;
  lat: number | null;
  lng: number | null;
  /** `score_priorite` de v_store_dette. Le front ne le recalcule jamais. */
  score: number;
};

export type ArretPropose = {
  storeId: string;
  position: number;
};

export type JourneeProposee = {
  userId: string;
  date: string;
  arrets: ArretPropose[];
  /** Magasin du créneau de montage de rayon de 6 h, si applicable. */
  montageStoreId: string | null;
};

/** Distance à vol d'oiseau en km (haversine). Suffisant pour ordonner des arrêts. */
export function distanceKm(
  a: { lat: number | null; lng: number | null },
  b: { lat: number | null; lng: number | null }
): number {
  if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) {
    return Number.POSITIVE_INFINITY; // sans coordonnées, on ne réordonne pas
  }
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Fenêtre de proximité : on ne cherche le voisin le plus proche que dans les
 * `PROFONDEUR_VOISINAGE` magasins les plus prioritaires encore disponibles.
 * Trop large, la géographie écrase la priorité ; trop étroite, la tournée
 * zigzague. Valeur revue si le terrain montre autre chose.
 */
const PROFONDEUR_VOISINAGE = 25;

/** Ordonne une liste d'arrêts par plus proche voisin à partir du premier. */
export function ordonnerParProximite<T extends { lat: number | null; lng: number | null }>(
  arrets: T[]
): T[] {
  if (arrets.length <= 2) return [...arrets];
  const restants = [...arrets];
  const ordonnes: T[] = [restants.shift() as T];
  while (restants.length > 0) {
    const dernier = ordonnes[ordonnes.length - 1];
    let meilleur = 0;
    let meilleureDistance = Number.POSITIVE_INFINITY;
    restants.forEach((candidat, index) => {
      const d = distanceKm(dernier, candidat);
      if (d < meilleureDistance) {
        meilleureDistance = d;
        meilleur = index;
      }
    });
    ordonnes.push(restants.splice(meilleur, 1)[0]);
  }
  return ordonnes;
}

export type EntreePlanification = {
  userId: string;
  /** Jours ouvrés réellement travaillés par cette personne (absences/fériés déjà retirés). */
  jours: string[];
  /** Magasins de son périmètre, triés par priorité décroissante, jamais planifiés dans l'horizon. */
  candidats: Candidat[];
  /** Magasins éligibles au montage de 6 h, du moins récemment monté au plus récent. */
  candidatsMontage: string[];
  visitesParJour: number;
  montagesParJour: number;
};

/** Construit la proposition de semaine d'UNE personne. */
export function proposerSemaine(entree: EntreePlanification): JourneeProposee[] {
  const restants = [...entree.candidats];
  const montages = [...entree.candidatsMontage];
  const parJour = Math.max(0, Math.round(entree.visitesParJour));
  const journees: JourneeProposee[] = [];

  for (const date of entree.jours) {
    if (restants.length === 0 && montages.length === 0) break;

    const choisis: Candidat[] = [];
    if (restants.length > 0 && parJour > 0) {
      choisis.push(restants.shift() as Candidat);
      while (choisis.length < parJour && restants.length > 0) {
        const fenetre = restants.slice(0, PROFONDEUR_VOISINAGE);
        const dernier = choisis[choisis.length - 1];
        let meilleur = 0;
        let meilleureDistance = Number.POSITIVE_INFINITY;
        fenetre.forEach((candidat, index) => {
          const d = distanceKm(dernier, candidat);
          if (d < meilleureDistance) {
            meilleureDistance = d;
            meilleur = index;
          }
        });
        choisis.push(restants.splice(meilleur, 1)[0]);
      }
    }

    const montageStoreId = entree.montagesParJour > 0 ? (montages.shift() ?? null) : null;
    if (choisis.length === 0 && montageStoreId === null) continue;

    journees.push({
      userId: entree.userId,
      date,
      // `choisis` est déjà chaîné de proche en proche depuis le magasin le plus
      // prioritaire : le rejouer ne changerait rien. `ordonnerParProximite` est
      // réservé au bouton « Réordonner » après une modification manuelle.
      arrets: choisis.map((c, index) => ({ storeId: c.storeId, position: index + 1 })),
      montageStoreId,
    });
  }

  return journees;
}
