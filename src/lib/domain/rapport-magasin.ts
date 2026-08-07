/**
 * Rapport de visites d'UN magasin — ce que le patron sort devant l'adhérent.
 *
 * Calcul pur : la même structure alimente la page imprimable et l'export
 * tableur, comme pour les feuilles de route. Deux chemins de calcul finiraient
 * par diverger, et ici la divergence se verrait devant un client.
 *
 * ⚠️ Séparation VOLONTAIRE entre ce qui est montrable et ce qui ne l'est pas.
 * Les remarques de visite, l'état du rayon et le détail des incidents sont des
 * appréciations INTERNES : « rayon mal tenu », « responsable pas coopératif ».
 * Elles vivent dans `interne`, jamais dans le corps du rapport, et ne sortent
 * que si Gérardo coche explicitement la case. Un rapport client qui déballe les
 * notes internes ne se rattrape pas.
 */

export type LigneVisite = {
  date: string;
  commercial: string;
  type: string;
  /** Interne : l'état du rayon constaté. */
  rayonConforme: boolean | null;
  /** Interne : la remarque libre du commercial. */
  remarque: string;
  /** Motif d'un dépannage — factuel, montrable. */
  motif: string;
};

export type LigneIncident = {
  date: string;
  type: string;
  criticite: number;
  statut: string;
  /** Interne : la description libre. */
  description: string;
};

export type LigneExercice = { annee: number; montant: number; ecartPct: number | null };

export type RapportMagasin = {
  magasin: {
    nom: string;
    enseigne: string;
    adresse: string;
    codePostal: string;
    ville: string;
    adherent: string;
    adherentTel: string;
    responsableFl: string;
    responsableFlTel: string;
  };
  periode: { du: string; au: string; mois: number };
  resume: {
    visites: number;
    derniereVisite: string | null;
    frequenceMoyenneJours: number | null;
    frequencePrevueJours: number | null;
    incidents: number;
  };
  visites: LigneVisite[];
  incidentsParType: { type: string; nombre: number }[];
  incidents: LigneIncident[];
  exercices: LigneExercice[];
};

/**
 * Intervalle moyen entre deux visites, en jours. `null` en dessous de deux
 * visites : avec une seule, il n'y a pas d'intervalle — afficher 0 ferait
 * croire à une visite quotidienne, et ce rapport est montré à un client.
 */
export function frequenceMoyenne(datesTriees: string[]): number | null {
  if (datesTriees.length < 2) return null;
  const premier = new Date(datesTriees[0]).getTime();
  const dernier = new Date(datesTriees[datesTriees.length - 1]).getTime();
  const jours = (dernier - premier) / 86_400_000;
  return Math.round(jours / (datesTriees.length - 1));
}

/** Compte les incidents par type, du plus fréquent au moins fréquent. */
export function grouperIncidents(
  incidents: { type: string }[]
): { type: string; nombre: number }[] {
  const par = new Map<string, number>();
  for (const i of incidents) par.set(i.type, (par.get(i.type) ?? 0) + 1);
  return [...par.entries()]
    .map(([type, nombre]) => ({ type, nombre }))
    .sort((a, b) => b.nombre - a.nombre);
}
