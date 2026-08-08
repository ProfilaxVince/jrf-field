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
 * Le classeur modèle propose le magasin en UNE colonne, « ITM-001 — Intermarché
 * Anderlecht », parce qu'une liste déroulante ne peut porter qu'une valeur et
 * qu'il faut à la fois la référence (pour la machine) et le nom (pour l'humain
 * qui choisit).
 *
 * On sépare ici. Le tiret cadratin est celui que le générateur écrit ; on
 * accepte aussi le tiret simple, parce qu'Excel et les copier-coller le
 * remplacent parfois. Ce qui ne ressemble pas à une référence est rendu tel
 * quel comme nom : un fichier au format plat continue de fonctionner.
 */
export function separerLibelleMagasin(valeur: string): { reference: string; nom: string } {
  const m = valeur.trim().match(/^([A-Z]{3}-\d{3})\s*[—–-]\s*(.+)$/);
  return m ? { reference: m[1], nom: m[2].trim() } : { reference: "", nom: valeur.trim() };
}

/**
 * Date écrite comme un humain la tape : JJ/MM/AAAA, JJ-MM-AAAA, ou l'ISO que
 * produit un export. Renvoie `null` plutôt qu'une date fausse — un passage
 * daté au mauvais jour est pire qu'un passage refusé.
 */
export function lireDate(valeur: string): string | null {
  // Un préfixe de jour de semaine est toléré : selon le format de la cellule,
  // Excel peut écrire « jeudi 06/08/2026 » dans un CSV. On ne fait pas
  // dépendre l'import d'un réglage d'affichage.
  const v = valeur.trim().replace(/^[^\d]+/, "").trim();
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

/**
 * Les noms de colonne acceptés. L'informatique n'écrira pas forcément les
 * nôtres — le classeur modèle le fait, un export Odoo non — et refuser un
 * fichier pour un intitulé est une dispute qu'on ne veut pas avoir chaque
 * jeudi. Le premier alias trouvé gagne.
 */
export const ALIAS: Record<keyof LigneBrute, string[]> = {
  reference_jrf: ["reference_jrf", "reference", "ref_jrf", "ref", "code_jrf"],
  code_magasin: ["code_magasin", "code_odoo", "magasin_code", "store_code"],
  nom_magasin: ["nom_magasin", "magasin", "nom", "store"],
  commercial: ["commercial", "vendeur", "utilisateur", "user", "employe", "employee"],
  date_visite: ["date_visite", "date", "jour", "date_passage"],
  heure_arrivee: ["heure_arrivee", "arrivee", "debut", "heure_debut", "check_in"],
  heure_depart: ["heure_depart", "depart", "fin", "heure_fin", "check_out"],
  id_ligne: ["id_ligne", "id", "identifiant", "line_id", "odoo_id"],
};

export type Positions = Record<keyof LigneBrute, number>;

const cleEntete = (e: string) =>
  e.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Les colonnes reconnues sur une ligne, si on la lisait comme un en-tête. */
function positionsDe(cellules: string[]): Positions {
  const entetes = cellules.map(cleEntete);
  return Object.fromEntries(
    (Object.keys(ALIAS) as (keyof LigneBrute)[]).map((champ) => [
      champ,
      ALIAS[champ].map((a) => entetes.indexOf(cleEntete(a))).find((i) => i >= 0) ?? -1,
    ])
  ) as Positions;
}

/**
 * Où commence le tableau ?
 *
 * Le classeur modèle porte deux lignes de consigne, puis une ligne vide, et
 * ses en-têtes seulement en ligne 4. Prendre la première ligne pour un en-tête
 * — ce que faisait la version précédente — n'y reconnaissait AUCUNE colonne et
 * refusait le fichier entier sans dire pourquoi. Le défaut valait aussi pour le
 * CSV exporté depuis ce classeur : il n'a jamais pu fonctionner.
 *
 * On cherche donc l'en-tête au lieu de le supposer : parmi les quinze
 * premières lignes, celle qui reconnaît le plus de colonnes, et au moins deux
 * pour ne pas confondre avec une ligne de données. Un fichier plat, en-têtes en
 * première ligne, tombe sur l'indice 0 — le format utilisé aujourd'hui par
 * l'informatique continue de passer.
 */
export function trouverEntete(
  lignes: string[][]
): { indice: number; position: Positions } | null {
  let meilleur: { indice: number; position: Positions; score: number } | null = null;
  for (let i = 0; i < Math.min(lignes.length, 15); i++) {
    const position = positionsDe(lignes[i]);
    const score = Object.values(position).filter((p) => p >= 0).length;
    if (score >= 2 && (!meilleur || score > meilleur.score)) {
      meilleur = { indice: i, position, score };
    }
  }
  return meilleur;
}

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
