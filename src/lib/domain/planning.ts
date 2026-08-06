/**
 * Aide à l'ordonnancement d'une journée — calculs PURS, aucun accès réseau.
 *
 * Le remplissage automatique a été RETIRÉ le 06/08/2026 : l'Admin compose ses
 * journées lui-même, magasin par magasin ou via un modèle de tournée.
 * Ne subsiste ici que le rangement d'une journée déjà choisie, à la demande —
 * jamais appliqué tout seul.
 *
 * Règle du projet inchangée : pas de solveur VRP. Plus proche voisin depuis le
 * premier arrêt, et l'Admin corrige à la main s'il n'est pas d'accord.
 */

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
 * Ordonne des arrêts par plus proche voisin, en partant du premier de la liste.
 * Le premier arrêt n'est jamais déplacé : c'est le point de départ choisi par
 * l'Admin, pas au moteur d'en décider.
 */
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
