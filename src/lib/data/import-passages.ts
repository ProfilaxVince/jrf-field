"use client";
/**
 * Import du fichier de passages transmis chaque jeudi par l'informatique.
 *
 * Deux temps, volontairement séparés :
 *   1. `analyserFichier` ne fait que LIRE. Il produit un aperçu ligne par
 *      ligne, sans rien écrire. Gérardo voit ce qui va se passer avant que ça
 *      se passe.
 *   2. `appliquerImport` écrit ce qui a été vu.
 *
 * Un import qui écrirait directement demanderait de faire confiance à un
 * fichier produit par un autre service, sur un référentiel qu'on ne maîtrise
 * pas. L'aperçu est la seule chose qui rend l'opération réversible avant coup.
 */
import { supabase } from "./supabase";
import { t } from "../i18n/fr-BE";
import { parseDelimited } from "../csv";
import { lireXlsx } from "../xlsx";
import { listStores, type StoreRow } from "./stores";
import { listAppUsers, type AppUserRow } from "./users";
import {
  ALIAS,
  cleDeReprise,
  instant,
  lireDate,
  lireHeure,
  nomConcorde,
  normaliser,
  separerLibelleMagasin,
  trouverEntete,
  type LigneBrute,
  type LigneNormalisee,
} from "../domain/import-passages";

export const SOURCE = "excel-it";

/** Le nom de la feuille du classeur modèle. */
export const FEUILLE = "Passages";

export type Verdict =
  | "creation"        // aucune visite prévue ce jour-là : on en crée une, déjà faite
  | "confirmation"    // une visite était prévue : on la marque faite
  | "deja_importee"   // la ligne est déjà passée : on ne fait rien
  | "refus";

export type LigneAnalysee = {
  ligne: number;
  brut: LigneBrute;
  verdict: Verdict;
  motif: string;
  magasin: StoreRow | null;
  commercial: AppUserRow | null;
  date: string | null;
  arrivee: string | null;
  depart: string | null;
  cle: string;
  visiteExistante: string | null;
};

export type Analyse = {
  lignes: LigneAnalysee[];
  /** Visites qui étaient prévues sur la période couverte et qui n'apparaissent
   *  pas dans le fichier. Elles n'ont pas eu lieu — mais on ne les annule PAS
   *  d'office : effacer du planning sur la foi d'un fichier tiers, personne ne
   *  l'a décidé. Gérardo tranche. */
  prevuesNonVues: { id: string; date: string; magasin: string; commercial: string }[];
};

/** Le fichier peut nommer un commercial par son surnom OU son adresse e-mail. */
function trouverCommercial(valeur: string, users: AppUserRow[]): AppUserRow | null {
  const v = normaliser(valeur);
  if (!v) return null;
  return (
    users.find((u) => normaliser(u.nickname) === v) ??
    users.find((u) => (u.email ?? "").toLowerCase() === valeur.trim().toLowerCase()) ??
    null
  );
}

/**
 * Analyse un tableau déjà découpé — feuille `.xlsx` ou CSV, la suite ne sait
 * pas d'où il vient. C'est ce qui permettra de brancher un jour un connecteur
 * Odoo sans toucher à une seule ligne de ce qui suit.
 */
export async function analyserLignes(brutes: string[][]): Promise<Analyse> {
  const entete = trouverEntete(brutes);
  // Un aperçu vide ne dit rien : l'utilisateur ne saurait pas s'il a pris le
  // mauvais fichier ou si l'informatique a renommé une colonne. On le dit.
  if (!entete) throw new Error(t.passages.enteteIntrouvable);
  const { position } = entete;
  // Le classeur modèle offre 120 lignes prêtes à remplir, toutes préformatées :
  // elles existent dans le fichier même vides. Sans ce filtre, l'aperçu affiche
  // cent refus « magasin absent » et le vrai contenu devient introuvable.
  // Le numéro conservé est celui de la ligne DANS LE FICHIER — c'est celui que
  // Gérardo doit retrouver à l'écran pour corriger.
  const corps = brutes
    .slice(entete.indice + 1)
    .map((cols, i) => ({ cols, ligne: entete.indice + 2 + i }))
    .filter(({ cols }) => cols.some((v) => v.trim().length > 0));

  const [magasins, users, correspondances] = await Promise.all([
    listStores(),
    listAppUsers(),
    supabase.from("external_refs").select("*").eq("kind", "store").eq("source", SOURCE),
  ]);

  const parReference = new Map(magasins.filter((m) => m.external_ref).map((m) => [m.external_ref!, m]));
  const parId = new Map(magasins.map((m) => [m.id, m]));
  const parCode = new Map(
    (correspondances.data ?? []).map((c) => [c.code, parId.get(c.target_id) ?? null])
  );

  // Les lignes normalisées d'abord : il faut les clés pour interroger la base.
  const normalisees: LigneNormalisee[] = corps.map(({ cols, ligne }) => {
    const lire = (c: keyof LigneBrute) =>
      position[c] >= 0 ? (cols[position[c]] ?? "").trim() : "";
    const brut = Object.fromEntries(
      (Object.keys(ALIAS) as (keyof LigneBrute)[]).map((c) => [c, lire(c)])
    ) as LigneBrute;

    // Classeur modèle : le magasin arrive en une seule colonne,
    // « ITM-001 — Intermarché Anderlecht ». On la redécoupe, sans écraser une
    // référence déjà fournie par un fichier au format plat.
    const combine = separerLibelleMagasin(brut.nom_magasin);
    if (combine.reference && !brut.reference_jrf) {
      brut.reference_jrf = combine.reference;
      brut.nom_magasin = combine.nom;
    }
    return {
      ligne,
      brut,
      date: lireDate(brut.date_visite),
      arrivee: lireHeure(brut.heure_arrivee),
      depart: lireHeure(brut.heure_depart),
    };
  });

  const resolues = normalisees.map((l) => {
    const magasin =
      (l.brut.reference_jrf && parReference.get(l.brut.reference_jrf)) ||
      (l.brut.code_magasin && parCode.get(l.brut.code_magasin)) ||
      null;
    const commercial = trouverCommercial(l.brut.commercial, users);
    return { l, magasin: magasin ?? null, commercial };
  });

  const cles = resolues
    .filter((r) => r.magasin && r.commercial && r.l.date)
    .map((r) => cleDeReprise(r.l, r.magasin!.id, r.commercial!.id));

  const dates = normalisees.map((l) => l.date).filter((d): d is string => Boolean(d)).sort();
  const [dejaImportees, visitesPeriode] = await Promise.all([
    cles.length
      ? supabase.from("visit_imports").select("cle").eq("source", SOURCE).in("cle", cles)
      : Promise.resolve({ data: [] as { cle: string }[] }),
    dates.length
      ? supabase
          .from("visits")
          .select("id, store_id, user_id, scheduled_date, status")
          .eq("active", true)
          .gte("scheduled_date", dates[0])
          .lte("scheduled_date", dates[dates.length - 1])
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const connues = new Set((dejaImportees.data ?? []).map((d) => d.cle));
  const prevues = (visitesPeriode.data ?? []).filter((v) => v.status === "planifiee");
  const prevuesVues = new Set<string>();

  const lignes: LigneAnalysee[] = resolues.map(({ l, magasin, commercial }) => {
    const base = {
      ligne: l.ligne,
      brut: l.brut,
      magasin,
      commercial,
      date: l.date,
      arrivee: l.arrivee,
      depart: l.depart,
      cle: "",
      visiteExistante: null as string | null,
    };
    const refus = (motif: string): LigneAnalysee => ({ ...base, verdict: "refus", motif });

    if (!magasin) return refus(l.brut.reference_jrf || l.brut.code_magasin ? "magasinInconnu" : "magasinAbsent");
    if (!nomConcorde(l.brut.nom_magasin, magasin.name)) return refus("nomDiscordant");
    if (!commercial) return refus(l.brut.commercial ? "commercialInconnu" : "commercialAbsent");
    if (!l.date) return refus("dateIllisible");

    const cle = cleDeReprise(l, magasin.id, commercial.id);
    if (connues.has(cle)) return { ...base, cle, verdict: "deja_importee", motif: "" };

    const prevue = prevues.find(
      (v) =>
        v.store_id === magasin.id &&
        v.user_id === commercial.id &&
        v.scheduled_date === l.date &&
        !prevuesVues.has(v.id)
    );
    if (prevue) prevuesVues.add(prevue.id);

    return {
      ...base,
      cle,
      verdict: prevue ? "confirmation" : "creation",
      motif: "",
      visiteExistante: prevue?.id ?? null,
    };
  });

  return {
    lignes,
    prevuesNonVues: prevues
      .filter((v) => !prevuesVues.has(v.id))
      .map((v) => ({
        id: v.id,
        date: v.scheduled_date,
        magasin: parId.get(v.store_id)?.name ?? "",
        commercial: users.find((u) => u.id === v.user_id)?.nickname ?? "",
      })),
  };
}

/** Entrée CSV — le format plat que l'informatique utilise aujourd'hui. */
export async function analyserFichier(texte: string): Promise<Analyse> {
  return analyserLignes(parseDelimited(texte));
}

/**
 * Entrée classeur. La feuille est prise PAR SON NOM, et c'est tout l'intérêt :
 * « Enregistrer sous → CSV » n'exporte que la feuille active, si bien qu'un
 * classeur à cinq feuilles finit tôt ou tard par nous arriver sous la forme de
 * la liste des 182 magasins. Ici la question ne se pose pas.
 *
 * Repli sur la première feuille si « Passages » n'existe pas : un classeur
 * fabriqué autrement reste lisible plutôt que rejeté.
 */
export async function analyserClasseur(buffer: ArrayBuffer): Promise<Analyse> {
  return analyserLignes(await lireXlsx(buffer, FEUILLE));
}

export type Bilan = { creees: number; confirmees: number; ignorees: number };

/**
 * Écrit ce que l'aperçu a montré. Les lignes refusées ne sont jamais touchées.
 * Chaque écriture est suivie de sa trace dans `visit_imports` : c'est elle qui
 * rendra le prochain import inoffensif sur les mêmes lignes.
 */
export async function appliquerImport(lignes: LigneAnalysee[]): Promise<Bilan> {
  const bilan: Bilan = { creees: 0, confirmees: 0, ignorees: 0 };

  for (const l of lignes) {
    if (l.verdict === "deja_importee") {
      bilan.ignorees++;
      continue;
    }
    if (l.verdict === "refus" || !l.magasin || !l.commercial || !l.date) continue;

    const horaires = {
      checkin_at: instant(l.date, l.arrivee),
      checkout_at: instant(l.date, l.depart),
    };

    let visiteId = l.visiteExistante;
    if (visiteId) {
      const { error } = await supabase
        .from("visits")
        .update({ status: "faite", source: SOURCE, ...horaires })
        .eq("id", visiteId);
      if (error) throw error;
      bilan.confirmees++;
    } else {
      const { data, error } = await supabase
        .from("visits")
        .insert({
          store_id: l.magasin.id,
          user_id: l.commercial.id,
          scheduled_date: l.date,
          visit_type: "conseil",
          status: "faite",
          source: SOURCE,
          ...horaires,
        })
        .select("id")
        .single();
      if (error) throw error;
      visiteId = data.id;
      bilan.creees++;
    }

    const { error } = await supabase
      .from("visit_imports")
      .upsert({ source: SOURCE, cle: l.cle, visit_id: visiteId }, { onConflict: "source,cle" });
    if (error) throw error;
  }

  return bilan;
}

/**
 * Mémorise qu'un code du système source désigne tel magasin. Fait une fois, il
 * dispense l'informatique de renseigner notre référence les semaines suivantes
 * — et c'est exactement ce dont un futur connecteur Odoo aura besoin.
 */
export async function memoriserCodeMagasin(code: string, storeId: string): Promise<void> {
  const { error } = await supabase
    .from("external_refs")
    .upsert(
      { kind: "store", source: SOURCE, code, target_id: storeId },
      { onConflict: "kind,source,code" }
    );
  if (error) throw error;
}
