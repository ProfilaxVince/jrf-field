/**
 * Normalisation et contrôle d'une ligne du fichier de passages transmis par
 * l'informatique de Jacques Remy.
 *
 * Calcul pur, sans réseau : c'est ici que se décide ce qui entre en base et ce
 * qui est refusé. Une ligne rattachée au mauvais magasin est invisible — elle
 * ne provoque aucune erreur, elle fausse simplement la dette de visite d'un
 * point de vente pendant des mois. Tout ce module existe pour rendre cette
 * faute impossible plutôt que probable.
 */
import { instantLocal } from "../dates";

/** Les mots d'enseigne ne distinguent rien : 95 magasins commencent par « Intermarché ». */
const MOTS_ENSEIGNE = new Set([
  "intermarche", "ad", "delhaize", "proxy", "spar", "by", "mestdagh", "sa", "srl",
]);

export function normaliser(valeur: string): string {
  return valeur
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Le nom du fichier ressemble-t-il à celui du magasin visé ?
 *
 * On compare ce qui reste APRÈS avoir retiré les mots d'enseigne : « AD
 * Delhaize Hankar » et « Delhaize HANKAR » se ressemblent par « hankar », pas
 * par « delhaize ». Un mot commun d'au moins quatre lettres suffit — au-delà
 * on refuserait des variantes légitimes (« Nimy - Vamodis » contre « Nimy »).
 *
 * Sans nom fourni, on ne contrôle rien et on l'accepte : le contrôle est une
 * sécurité, pas une exigence.
 */
export function nomConcorde(nomFichier: string, nomMagasin: string): boolean {
  if (!nomFichier.trim()) return true;
  const mots = (v: string) =>
    new Set(
      normaliser(v)
        .split(" ")
        .filter((m) => m.length >= 4 && !MOTS_ENSEIGNE.has(m))
    );
  const a = mots(nomFichier);
  const b = mots(nomMagasin);
  // Si l'un des deux ne contient QUE des mots d'enseigne, il n'y a rien à
  // comparer — refuser serait arbitraire.
  if (a.size === 0 || b.size === 0) return true;
  for (const m of a) if (b.has(m)) return true;
  return false;
}

/**
 * Date écrite comme un humain la tape : JJ/MM/AAAA, JJ-MM-AAAA, ou l'ISO que
 * produit un export. Renvoie `null` plutôt qu'une date fausse — un passage
 * daté au mauvais jour est pire qu'un passage refusé.
 */
export function lireDate(valeur: string): string | null {
  const v = valeur.trim();
  if (!v) return null;

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const fr = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (!fr) return null;
  const jour = Number(fr[1]);
  const mois = Number(fr[2]);
  let annee = Number(fr[3]);
  if (annee < 100) annee += 2000;
  if (jour < 1 || jour > 31 || mois < 1 || mois > 12) return null;

  // Contrôle réel du calendrier : le 31/02 passerait les bornes ci-dessus.
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  if (d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  return d.toISOString().slice(0, 10);
}

/** « 9:15 », « 09h15 », « 09:15:00 » → « 09:15 ». Sinon `null`. */
export function lireHeure(valeur: string): string | null {
  const m = valeur.trim().match(/^(\d{1,2})\s*[:hH.]\s*(\d{2})/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export type LigneBrute = {
  reference_jrf: string;
  code_magasin: string;
  nom_magasin: string;
  commercial: string;
  date_visite: string;
  heure_arrivee: string;
  heure_depart: string;
  id_ligne: string;
};

export type LigneNormalisee = {
  ligne: number;
  brut: LigneBrute;
  date: string | null;
  arrivee: string | null;
  depart: string | null;
};

/**
 * La clé de reprise. Avec l'identifiant de ligne du système source, elle est
 * exacte et définitive. Sans lui, on la reconstruit — et deux passages le même
 * jour dans le même magasin, à la même heure, sont alors indistinguables :
 * c'est précisément ce que la question A3 posée à l'informatique cherche à
 * éviter.
 */
export function cleDeReprise(
  l: LigneNormalisee,
  storeId: string,
  userId: string
): string {
  if (l.brut.id_ligne.trim()) return `id:${l.brut.id_ligne.trim()}`;
  return `nat:${storeId}|${userId}|${l.date}|${l.arrivee ?? ""}`;
}

/**
 * Un horaire local belge devient un instant UTC — stockage UTC, règle du projet.
 * Le décalage n'est PAS écrit en dur : voir `instantLocal` dans `lib/dates`.
 */
export function instant(date: string, heure: string | null): string | null {
  return heure ? instantLocal(date, heure) : null;
}
