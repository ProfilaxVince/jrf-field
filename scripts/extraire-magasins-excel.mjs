#!/usr/bin/env node
/**
 * Convertit l'Excel de suivi des visites (« Visites Inter Delhaize ») en CSV
 * importable par l'écran Magasins.
 *
 * Pourquoi un script plutôt qu'un fichier écrit à la main : la correspondance
 * entre un libellé Excel (« INTERMARECHE CHATELINEAU BY ») et une commune
 * officielle est une INTERPRÉTATION. Elle doit être relisible, corrigeable et
 * rejouable — pas enfouie dans un CSV que personne ne pourra vérifier.
 *
 * Ce script ne fait que lire la colonne des libellés. Toute l'interprétation
 * — commune, enseigne, nom, doublons, référence — vit dans `magasins-source.mjs`.
 *
 * L'Excel n'est PAS dans le dépôt. Sans lui, ce script ne tourne pas : pour
 * seulement répercuter une nouvelle adresse ou une commune corrigée sur le CSV
 * déjà produit, utiliser `completer-magasins-csv.mjs`.
 *
 * Usage : node scripts/extraire-magasins-excel.mjs <fichier.xlsx> [sortie.csv]
 */

import fs from "fs";
import { execFileSync } from "child_process";
import { ADRESSES, construireMagasins } from "./magasins-source.mjs";
import { COLONNES, echapper, rapport } from "./magasins-csv.mjs";

function lireFeuille(fichier) {
  const script = `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
ws = wb[wb.sheetnames[0]]
out = []
for r in ws.iter_rows(min_row=1, max_row=ws.max_row, values_only=True):
    out.append([("" if c is None else str(c).strip()) for c in r])
print(json.dumps(out))
`;
  return JSON.parse(execFileSync("python3", ["-c", script, fichier], { maxBuffer: 64e6 }));
}

// ---------------------------------------------------------------------------
const fichier = process.argv[2];
const sortie = process.argv[3] ?? "magasins-jrf.csv";
if (!fichier) {
  console.error("Usage: node scripts/extraire-magasins-excel.mjs <fichier.xlsx> [sortie.csv]");
  process.exit(1);
}

const libelles = lireFeuille(fichier)
  .map((cols) => (cols[1] ?? "").trim())
  .filter(Boolean);

const { magasins, ecartes, inconnus, communesAConfirmer } = construireMagasins(libelles);

const csv = [
  COLONNES.join(";"),
  ...magasins.map((m) => COLONNES.map((c) => echapper(m[c] ?? "")).join(";")),
].join("\r\n");
fs.writeFileSync(sortie, "﻿" + csv);

console.log(`\n${magasins.length} magasins écrits dans ${sortie}`);
const parEnseigne = {};
for (const m of magasins) parEnseigne[m.enseigne] = (parEnseigne[m.enseigne] ?? 0) + 1;
console.log("\nPar enseigne :");
for (const [e, n] of Object.entries(parEnseigne).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${e}`);
}
console.log(`\nCommune renseignée : ${magasins.filter((m) => m.ville).length}/${magasins.length}`);
rapport(magasins, ADRESSES, { ecartes, inconnus, communesAConfirmer });
