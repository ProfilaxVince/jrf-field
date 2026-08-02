/**
 * Toutes les chaînes d'interface. Aucun texte en dur dans un composant.
 * Règle de propreté, pas de préparation NL (utilisateurs 100 % francophones).
 * Vocabulaire : jamais de jargon. "Dette de visite" est un terme de code,
 * l'UI dit "Vu il y a N jours" / "En retard de N jours".
 */
export const t = {
  app: {
    name: "JRF Field",
    company: "Jacques Remy & Fils",
    tagline: "Suivi des visites en magasin",
  },
  home: {
    adminPortal: "Portail responsable",
    adminPortalHint: "Planifier les semaines, suivre les visites",
    fieldPortal: "Portail commercial",
    fieldPortalHint: "Ma tournée du jour",
  },
  common: {
    loading: "Chargement…",
    offlineSaved: "Pas de réseau. C'est enregistré, ça partira tout seul dès que la connexion revient.",
    undo: "Annuler",
    save: "Enregistrer",
  },
  visite: {
    seenAgo: (days: number) => `Vu il y a ${days} ${days > 1 ? "jours" : "jour"}`,
    late: (days: number) => `En retard de ${days} ${days > 1 ? "jours" : "jour"}`,
    neverSeen: "Jamais visité",
  },
} as const;
