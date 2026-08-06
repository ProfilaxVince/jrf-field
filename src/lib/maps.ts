/**
 * Lien d'itinéraire vers un magasin.
 *
 * Les coordonnées passent avant l'adresse : sur 185 magasins dont beaucoup
 * partagent un nom, une recherche textuelle peut envoyer au mauvais endroit.
 * Un couple lat/lng ne se trompe pas. L'adresse n'est qu'un repli.
 *
 * `travelmode=driving` lance directement la navigation voiture, sans écran
 * intermédiaire : le commercial est déjà au volant.
 */
export function lienItineraire(magasin: {
  name: string;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
}): string | null {
  const base = "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=";

  if (magasin.lat != null && magasin.lng != null) {
    return `${base}${magasin.lat},${magasin.lng}`;
  }

  const adresse = [magasin.address, magasin.postal_code, magasin.city, "Belgique"]
    .filter(Boolean)
    .join(", ");
  if (!magasin.city) return null; // sans ville, un itinéraire serait un pari
  return `${base}${encodeURIComponent(`${magasin.name}, ${adresse}`)}`;
}
