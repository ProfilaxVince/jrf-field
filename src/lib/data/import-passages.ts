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
import { parseDelimited } from "../csv";
import { listStores, type StoreRow } from "./stores";
import { listAppUsers, type AppUserRow } from "./users";
import {
  cleDeReprise,
  instant,
  lireDate,
  lireHeure,
  nomConcorde,
  normaliser,
  separerLibelleMagasin,
  type LigneBrute,
  type LigneNormalisee,
} from "../domain/import-passages";

export const SOURCE = "excel-it";

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

const ALIAS: Record<keyof LigneBrute, string[]> = {
  reference_jrf: ["reference_jrf", "reference", "ref_jrf", "ref", "code_jrf"],
  code_magasin: ["code_magasin", "code_odoo", "magasin_code", "store_code"],
  nom_magasin: ["nom_magasin", "magasin", "nom", "store"],
  commercial: ["commercial", "vendeur", "utilisateur", "user", "employe", "employee"],
  date_visite: ["date_visite", "date", "jour", "date_passage"],
  heure_arrivee: ["heure_arrivee", "arrivee", "debut", "heure_debut", "check_in"],
  heure_depart: ["heure_depart", "depart", "fin", "heure_fin", "check_out"],
  id_ligne: ["id_ligne", "id", "identifiant", "line_id", "odoo_id"],
};

const cleEntete = (e: string) =>
  e.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

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

export async function analyserFichier(texte: string): Promise<Analyse> {
  const brutes = parseDelimited(texte);
  if (brutes.length < 2) return { lignes: [], prevuesNonVues: [] };

  const entetes = (brutes.shift() as string[]).map(cleEntete);
  const position = Object.fromEntries(
    (Object.keys(ALIAS) as (keyof LigneBrute)[]).map((champ) => [
      champ,
      ALIAS[champ].map((a) => entetes.indexOf(cleEntete(a))).find((i) => i >= 0) ?? -1,
    ])
  ) as Record<keyof LigneBrute, number>;

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
  const normalisees: LigneNormalisee[] = brutes.map((cols, i) => {
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
      ligne: i + 2,
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
