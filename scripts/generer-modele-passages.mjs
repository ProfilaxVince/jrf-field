#!/usr/bin/env node
/**
 * Produit `docs/modele-passages.xlsx` — le classeur remis à l'IT de Jacques
 * Remy pour qu'il y dépose les passages effectués.
 *
 * Trois feuilles, et l'ordre compte :
 *   1. « Passages »  — celle qu'on remplit. Rien d'autre à faire.
 *   2. « Mode d'emploi » — une colonne par ligne, ce qu'on attend, un exemple.
 *   3. « Magasins »  — les 182 références JRF, pour un RECHERCHEV depuis
 *      leur propre référentiel. Sans elle, le rapprochement se ferait sur le
 *      nom et casserait en silence.
 *
 * Le fichier est généré, pas écrit à la main : le jour où le parc change, on
 * relance le script au lieu de rouvrir Excel.
 *
 * Usage : node scripts/generer-modele-passages.mjs
 */

import fs from "fs";
import { execFileSync } from "child_process";
import { decouper } from "./magasins-csv.mjs";

const CSV = "supabase/manual/magasins-reels.csv";
const SORTIE = "docs/modele-passages.xlsx";

const lignes = fs
  .readFileSync(CSV, "utf8")
  .replace(/^﻿/, "")
  .split(/\r?\n/)
  .filter(Boolean);
const entetes = decouper(lignes[0]);
const idx = Object.fromEntries(entetes.map((c, i) => [c, i]));

const magasins = lignes.slice(1).map((l) => {
  const c = decouper(l);
  return [c[idx.reference], c[idx.nom], c[idx.code_postal], c[idx.ville], c[idx.enseigne]];
});

/**
 * Les colonnes attendues. `obligatoire` décide de la couleur de l'en-tête :
 * l'IT doit voir en un coup d'œil ce qui bloque et ce qui est bonus.
 */
const COLONNES = [
  ["reference_jrf", true, "Référence du magasin chez JRF — voir la feuille « Magasins »", "ITM-001"],
  ["code_magasin", false, "Votre identifiant interne du magasin (Odoo). Facultatif, mais s'il est fourni une seule fois, il sera mémorisé et suffira ensuite.", "ODOO-4821"],
  ["nom_magasin", true, "Nom du magasin, tel que vous l'avez. Sert de CONTRÔLE : si le nom ne ressemble pas à celui de la référence, la ligne est signalée au lieu d'être importée au mauvais endroit.", "Intermarché Anderlecht"],
  ["commercial", true, "Prénom d'usage OU adresse e-mail du commercial", "Gerardo"],
  ["date_visite", true, "Jour du passage, au format JJ/MM/AAAA", "04/08/2026"],
  ["heure_arrivee", false, "Heure d'arrivée si vous l'avez (HH:MM). Elle permet de mesurer la durée réelle des visites.", "09:15"],
  ["heure_depart", false, "Heure de départ si vous l'avez (HH:MM)", "10:05"],
  ["id_ligne", false, "Votre identifiant unique de ce pointage. S'il est fourni, renvoyer deux fois le même fichier ne crée jamais de doublon.", "12345"],
];

const EXEMPLES = [
  ["ITM-001", "ODOO-4821", "Intermarché Anderlecht", "Gerardo", "04/08/2026", "09:15", "10:05", "12345"],
  ["ADD-030", "", "AD Delhaize Hankar", "Michou", "05/08/2026", "", "", ""],
];

// ---------------------------------------------------------------------------
// Génération via openpyxl : Python est là (il sert déjà à lire l'Excel de
// Gérardo), et écrire un .xlsx à la main reviendrait à fabriquer un ZIP d'XML.
// ---------------------------------------------------------------------------
const script = `
import json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

donnees = json.loads(sys.argv[1])
wb = Workbook()

VERT = PatternFill("solid", fgColor="1B5E3F")
GRIS = PatternFill("solid", fgColor="8A9A92")
BLANC = Font(color="FFFFFF", bold=True)

# ---- 1. Passages : la feuille à remplir -------------------------------------
ws = wb.active
ws.title = "Passages"
for i, (nom, obligatoire, _aide, _ex) in enumerate(donnees["colonnes"], start=1):
    c = ws.cell(row=1, column=i, value=nom)
    c.fill = VERT if obligatoire else GRIS
    c.font = BLANC
    ws.column_dimensions[get_column_letter(i)].width = max(16, len(nom) + 4)
for r, ligne in enumerate(donnees["exemples"], start=2):
    for i, v in enumerate(ligne, start=1):
        ws.cell(row=r, column=i, value=v)
ws.freeze_panes = "A2"

# ---- 2. Mode d'emploi -------------------------------------------------------
md = wb.create_sheet("Mode d'emploi")
md["A1"] = "Comment remplir la feuille « Passages »"
md["A1"].font = Font(bold=True, size=14)
md["A3"] = "Une ligne = un passage d'un commercial dans un magasin."
md["A4"] = "Les deux lignes d'exemple sont à SUPPRIMER avant l'envoi."
md["A5"] = "En-tête vert = obligatoire. En-tête gris = facultatif, mais utile."
for i, titre in enumerate(["Colonne", "Obligatoire", "Ce qu'on attend", "Exemple"], start=1):
    c = md.cell(row=7, column=i, value=titre)
    c.fill = VERT
    c.font = BLANC
for r, (nom, obligatoire, aide, ex) in enumerate(donnees["colonnes"], start=8):
    md.cell(row=r, column=1, value=nom)
    md.cell(row=r, column=2, value="oui" if obligatoire else "non")
    cell = md.cell(row=r, column=3, value=aide)
    cell.alignment = Alignment(wrap_text=True, vertical="top")
    md.cell(row=r, column=4, value=ex)
    md.row_dimensions[r].height = 34
for lettre, largeur in (("A", 20), ("B", 13), ("C", 78), ("D", 22)):
    md.column_dimensions[lettre].width = largeur

# ---- 3. Magasins : le référentiel pour un RECHERCHEV -------------------------
mg = wb.create_sheet("Magasins")
for i, titre in enumerate(["reference_jrf", "nom_magasin", "code_postal", "ville", "enseigne"], start=1):
    c = mg.cell(row=1, column=i, value=titre)
    c.fill = VERT
    c.font = BLANC
for r, ligne in enumerate(donnees["magasins"], start=2):
    for i, v in enumerate(ligne, start=1):
        mg.cell(row=r, column=i, value=v)
mg.freeze_panes = "A2"
for lettre, largeur in (("A", 16), ("B", 38), ("C", 14), ("D", 24), ("E", 18)):
    mg.column_dimensions[lettre].width = largeur

wb.save(sys.argv[2])
print(len(donnees["magasins"]))
`;

fs.mkdirSync("docs", { recursive: true });
const n = execFileSync(
  "python3",
  ["-c", script, JSON.stringify({ colonnes: COLONNES, exemples: EXEMPLES, magasins }), SORTIE],
  { encoding: "utf8" }
).trim();

console.log(`\n${SORTIE} écrit`);
console.log(`  feuille « Passages »     : ${COLONNES.length} colonnes, ${EXEMPLES.length} lignes d'exemple`);
console.log(`  feuille « Mode d'emploi »`);
console.log(`  feuille « Magasins »     : ${n} références\n`);
