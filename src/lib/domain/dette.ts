/**
 * Traduction de la dette (calculée en SQL) en UNE phrase compréhensible.
 * Aucun calcul métier ici : uniquement de la mise en mots.
 * Le mot « dette » ne sort jamais à l'écran — voir CLAUDE.md.
 */
import { etatDette, type EtatDette, type Tier } from "./types";

export type DetteAffichable = {
  etat: EtatDette;
  /** Phrase principale : « En retard de 9 jours » / « Vu il y a 23 jours » / « Jamais visité ». */
  libelle: string;
  /** Vrai si le magasin a dépassé sa fréquence cible. */
  enRetard: boolean;
};

type Source = {
  tier: Tier | null;
  dette_visite: number | null;
  jours_depuis_derniere_visite: number | null;
  frequence_cible_jours: number | null;
  last_visit_at: string | null;
};

export function detteAffichable(
  source: Source,
  libelles: {
    neverSeen: string;
    late: (jours: number) => string;
    seenAgo: (jours: number) => string;
    dueToday: string;
    dueSoon: (jours: number) => string;
    onTime: string;
  }
): DetteAffichable {
  const tier = source.tier ?? "C";
  const dette = source.dette_visite ?? 0;
  const etat = etatDette(dette, tier);

  if (source.last_visit_at === null) {
    return { etat, libelle: libelles.neverSeen, enRetard: true };
  }

  const joursDepuis = source.jours_depuis_derniere_visite ?? 0;
  const cible = source.frequence_cible_jours ?? 0;
  const restant = cible - joursDepuis;

  if (restant < 0) return { etat, libelle: libelles.late(-restant), enRetard: true };
  if (restant === 0) return { etat, libelle: libelles.dueToday, enRetard: false };
  if (restant <= 3) return { etat, libelle: libelles.dueSoon(restant), enRetard: false };
  return {
    etat,
    libelle: joursDepuis > 0 ? libelles.seenAgo(joursDepuis) : libelles.onTime,
    enRetard: false,
  };
}
