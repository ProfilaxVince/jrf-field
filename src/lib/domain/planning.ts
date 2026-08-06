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

/** Un commercial, un jour : une case à remplir. */
export type Creneau = { userId: string; date: string };

export type EntreeRepartition = {
  /**
   * Créneaux à servir, DANS L'ORDRE. L'appelant les range jour par jour
   * (lundi pour tout le monde, puis mardi…) : ainsi les magasins qui
   * attendent le plus partent en début de semaine, répartis sur l'équipe.
   */
  creneaux: Creneau[];
  /**
   * Tout le parc, trié par priorité décroissante. Il n'y a PAS de périmètre :
   * n'importe quel commercial peut passer dans n'importe quel magasin
   * (politique confirmée le 06/08/2026). Le pool est donc commun, et un
   * magasin servi à quelqu'un disparaît pour les autres.
   */
  candidats: Candidat[];
  /** Magasins éligibles au montage de 6 h, du moins récemment monté au plus récent. */
  candidatsMontage: string[];
  visitesParJour: number;
  montagesParJour: number;
};

/** Choisit le voisin le plus proche parmi les plus prioritaires encore libres. */
function prendreLePlusProche(depuis: Candidat, restants: Candidat[]): Candidat {
  const fenetre = Math.min(PROFONDEUR_VOISINAGE, restants.length);
  let meilleur = 0;
  let meilleureDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < fenetre; i++) {
    const d = distanceKm(depuis, restants[i]);
    if (d < meilleureDistance) {
      meilleureDistance = d;
      meilleur = i;
    }
  }
  return restants.splice(meilleur, 1)[0];
}

/**
 * Répartit le parc sur les créneaux de la semaine.
 *
 * Un seul pool pour toute l'équipe : le magasin le plus en attente ouvre le
 * premier créneau, ses voisins remplissent la journée, et le suivant ouvre le
 * créneau d'après. Personne ne se voit attribuer deux fois le même magasin
 * puisqu'il sort du pool dès qu'il est servi.
 */
export function repartirSemaine(entree: EntreeRepartition): JourneeProposee[] {
  const restants = [...entree.candidats];
  const montages = [...entree.candidatsMontage];
  const parJour = Math.max(0, Math.round(entree.visitesParJour));
  const journees: JourneeProposee[] = [];

  for (const creneau of entree.creneaux) {
    if (restants.length === 0 && montages.length === 0) break;

    const choisis: Candidat[] = [];
    if (parJour > 0 && restants.length > 0) {
      choisis.push(restants.shift() as Candidat);
      while (choisis.length < parJour && restants.length > 0) {
        choisis.push(prendreLePlusProche(choisis[choisis.length - 1], restants));
      }
    }

    const montageStoreId = entree.montagesParJour > 0 ? (montages.shift() ?? null) : null;
    if (choisis.length === 0 && montageStoreId === null) continue;

    journees.push({
      userId: creneau.userId,
      date: creneau.date,
      // `choisis` est déjà chaîné de proche en proche depuis le magasin le plus
      // prioritaire : le rejouer ne changerait rien. `ordonnerParProximite` est
      // réservé au bouton « Réordonner » après une modification manuelle.
      arrets: choisis.map((c, index) => ({ storeId: c.storeId, position: index + 1 })),
      montageStoreId,
    });
  }

  return journees;
}
