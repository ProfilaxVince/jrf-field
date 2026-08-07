/**
 * La feuille de semaine d'un commercial : ce que Gérardo imprime ou envoie
 * pour que chacun ait sa semaine sur papier.
 *
 * Calcul pur, sans accès réseau ni React : les deux sorties — impression et
 * tableur — partent de la MÊME structure. Deux chemins de calcul finiraient
 * par diverger, et le jour où ils divergent, la feuille papier et le tableur
 * ne disent plus la même chose à deux personnes qui se parlent.
 */
import { formatDate, formatJourLong, jourISO, lundiDeLaSemaine, numeroSemaineISO } from "../dates";
import { addDays } from "date-fns";

export type ArretFeuille = {
  ordre: number;
  magasin: string;
  ville: string;
  codePostal: string;
  adresse: string;
  type: string;
  adherent: string;
  adherentTel: string;
  responsableFl: string;
  responsableFlTel: string;
};

export type JourFeuille = {
  date: string;
  libelle: string;
  indisponible: boolean;
  arrets: ArretFeuille[];
};

export type SemaineFeuille = {
  numero: number;
  du: string;
  au: string;
  jours: JourFeuille[];
};

export type FeuilleCommercial = {
  userId: string;
  surnom: string;
  nomComplet: string;
  couleur: string;
  semaines: SemaineFeuille[];
  total: number;
};

/** Les 5 jours ouvrés de chaque semaine demandée, à partir d'un lundi. */
export function semainesOuvrees(reference: Date, nombreDeSemaines: number): string[][] {
  const lundi = lundiDeLaSemaine(reference);
  return Array.from({ length: nombreDeSemaines }, (_, s) =>
    [0, 1, 2, 3, 4].map((j) => jourISO(addDays(lundi, s * 7 + j)))
  );
}

type Entree = {
  userId: string;
  date: string;
  position: number;
  type: string;
  magasin: {
    name: string;
    city: string;
    postal_code: string | null;
    address: string | null;
    adherent_name: string | null;
    adherent_phone: string | null;
    fl_manager_name: string | null;
    fl_manager_phone: string | null;
  } | null;
};

type Personne = { id: string; nickname: string; nomComplet: string; couleur: string };

/**
 * Assemble une feuille par commercial. Les jours sans arrêt sont CONSERVÉS :
 * une ligne « rien de prévu » se lit, un trou dans le tableau se discute.
 */
export function construireFeuilles(
  personnes: Personne[],
  entrees: Entree[],
  grilles: string[][],
  indisponible: (userId: string, date: string) => boolean
): FeuilleCommercial[] {
  return personnes.map((p) => {
    const semaines = grilles.map((jours) => ({
      numero: numeroSemaineISO(new Date(jours[0])),
      du: formatDate(jours[0]),
      au: formatDate(jours[4]),
      jours: jours.map((date) => ({
        date,
        libelle: formatJourLong(date),
        indisponible: indisponible(p.id, date),
        arrets: entrees
          .filter((e) => e.userId === p.id && e.date === date)
          .sort((a, b) => a.position - b.position)
          .map((e, i) => ({
            ordre: i + 1,
            magasin: e.magasin?.name ?? "",
            ville: e.magasin?.city ?? "",
            codePostal: e.magasin?.postal_code ?? "",
            adresse: e.magasin?.address ?? "",
            type: e.type,
            adherent: e.magasin?.adherent_name ?? "",
            adherentTel: e.magasin?.adherent_phone ?? "",
            responsableFl: e.magasin?.fl_manager_name ?? "",
            responsableFlTel: e.magasin?.fl_manager_phone ?? "",
          })),
      })),
    }));

    return {
      userId: p.id,
      surnom: p.nickname,
      nomComplet: p.nomComplet,
      couleur: p.couleur,
      semaines,
      total: semaines.reduce(
        (n, s) => n + s.jours.reduce((m, j) => m + j.arrets.length, 0),
        0
      ),
    };
  });
}
