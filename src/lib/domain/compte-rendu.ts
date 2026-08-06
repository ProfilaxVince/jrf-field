/**
 * Compte rendu de visite — forme exacte du `visits.report jsonb` (fixée au Lot 4).
 * Les deux informations que l'Admin filtre (`notes`, `rayon_conforme`) sont des
 * colonnes réelles, pas du JSON : on ne filtre pas 185 magasins sur du jsonb.
 */
export type CompteRendu = {
  /** Message destiné à la centrale de distribution (relais terrain). */
  message_centrale?: string;
  /** Produits vus en rupture, saisie libre. */
  ruptures?: string;
  /** Nombre de photos jointes au moment de l'envoi (contrôle de cohérence). */
  photos?: number;
};

export type SaisieCompteRendu = {
  rayonConforme: boolean | null;
  notes: string;
  relaisCentrale: boolean;
  messageCentrale: string;
  ruptures: string;
};

export const SAISIE_VIDE: SaisieCompteRendu = {
  rayonConforme: null,
  notes: "",
  relaisCentrale: false,
  messageCentrale: "",
  ruptures: "",
};

/** Une visite ne compte que si le compte rendu dit quelque chose de l'état du rayon. */
export function compteRenduValide(saisie: SaisieCompteRendu): boolean {
  if (saisie.rayonConforme === null) return false;
  if (saisie.relaisCentrale && saisie.messageCentrale.trim().length === 0) return false;
  return true;
}
