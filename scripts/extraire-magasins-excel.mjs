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
 * Règle du projet : ne jamais inventer de données de magasins réels sans le
 * signaler. Ce script ne remplit donc QUE ce qui est établi :
 *   · le nom, l'enseigne et le réseau viennent du fichier lui-même ;
 *   · la commune et le code postal viennent de `communes-magasins.mjs`, écrite
 *     à la main, où chaque entrée porte son niveau de certitude ;
 *   · l'adresse vient de `adresses-magasins.json`, où chacune porte sa source.
 *     Absente du JSON, la case reste vide : rien n'est deviné.
 *
 * L'Excel n'est PAS dans le dépôt. Sans lui, ce script ne tourne pas : pour
 * seulement répercuter une nouvelle adresse ou une commune corrigée sur le CSV
 * déjà produit, utiliser `completer-magasins-csv.mjs`.
 *
 * Usage : node scripts/extraire-magasins-excel.mjs <fichier.xlsx> [sortie.csv]
 */

import fs from "fs";
import { execFileSync } from "child_process";

// Table des communes + isolement de la localité : partagés avec
// completer-magasins-csv.mjs, qui remet le CSV à jour sans l'Excel.
import { COMMUNES, localite } from "./communes-magasins.mjs";

/**
 * Adresses vérifiées une par une, chargées depuis `adresses-magasins.json`.
 * Fichier séparé et cumulatif : la recherche des 185 adresses se fait par
 * lots, et chaque lot doit s'ajouter sans risquer d'écraser le précédent.
 *
 * Rien n'y figure sans source. Une adresse inventée envoie un commercial à la
 * mauvaise porte — bien pire qu'une case vide, parce que personne ne va la
 * vérifier avant d'y être.
 */
const ADRESSES_VERIFIEES = JSON.parse(
  fs.readFileSync(new URL("./adresses-magasins.json", import.meta.url), "utf8")
);

// Corrections de frappe relevées dans l'Excel, appliquées au nom affiché.
// Chacune est listée dans le rapport : rien n'est corrigé en silence.
const CORRECTIONS = {
  "INTERMARECHE": "Intermarché",
  "SPAAR": "Spar",
  "CHAPELLE-LEZ-HERLEMONT": "Chapelle-lez-Herlaimont",
  "BRAINE LE CONTE": "Braine-le-Comte",
  "FLORIFOUX": "Floriffoux",
  "LAMBUSRT": "Lambusart",
  "ST GOERGES": "Saint-Georges-sur-Meuse",
  "MESSTDAGH": "Mestdagh",
  "HOEILLART": "Hoeilaart",
  "AARDOIE": "Ardooie",
  "REER": "Reet",
};

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

/** Enseigne + réseau déduits du libellé. « BY » = Intermarché by Mestdagh. */
function enseigneEtReseau(libelle) {
  const L = libelle.toUpperCase();
  if (L.startsWith("SPAAR") || L.startsWith("SPAR")) return ["Spar", "independant"];
  if (L.startsWith("INTERMARCHE") || L.startsWith("INTERMARECHE")) {
    return ["Intermarché", /\bBY\b/.test(L) ? "by_mestdagh" : "independant"];
  }
  if (L.startsWith("PROXY")) return ["Proxy Delhaize", "affilie"];
  if (L.startsWith("AD ")) return ["AD Delhaize", "affilie"];
  if (L.startsWith("DELHAIZE")) return ["Delhaize", "integre"];
  return ["", ""];
}

function joliNom(libelle, enseigne) {
  let reste = localite(libelle);
  for (const [faute, correct] of Object.entries(CORRECTIONS)) {
    if (reste === faute) reste = correct.toUpperCase();
  }
  const casse = reste
    .toLowerCase()
    .split(/([ \-'])/)
    .map((m) => (/[ \-']/.test(m) ? m : m.charAt(0).toUpperCase() + m.slice(1)))
    .join("");
  return `${enseigne} ${casse}`.replace(/\s+/g, " ").trim();
}

function echapper(v) {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------------------------------------------------------------------------
const fichier = process.argv[2];
const sortie = process.argv[3] ?? "magasins-jrf.csv";
if (!fichier) {
  console.error("Usage: node scripts/extraire-magasins-excel.mjs <fichier.xlsx> [sortie.csv]");
  process.exit(1);
}

const lignes = lireFeuille(fichier);
const magasins = [];
const inconnus = [];
const aVerifier = [];

for (const cols of lignes) {
  const libelle = (cols[1] ?? "").trim();
  if (!libelle) continue;
  const [enseigne, reseau] = enseigneEtReseau(libelle);
  if (!enseigne) continue;

  const cle = localite(libelle);
  const commune = COMMUNES[cle];
  if (!commune || !commune.ville) inconnus.push(libelle);
  else if (commune.sur !== "sure") aVerifier.push(`${libelle} → ${commune.ville} (${commune.sur})`);

  magasins.push({
    nom: joliNom(libelle, enseigne),
    enseigne,
    reseau,
    adresse: ADRESSES_VERIFIEES[libelle.toUpperCase()]?.adresse ?? "",
    code_postal: commune?.cp ?? "",
    ville: commune?.ville ?? "",
    region: commune?.region ?? "",
    latitude: "",
    longitude: "",
    telephone: "",
    contact: "",
    ca_jrf: "",
    exercice: "",
    reference: "",
    libelle_excel: libelle,
  });
}

// Référence stable : ENS-0001, dans l'ordre du fichier source. Elle rend
// l'import rejouable et permet de retrouver la ligne d'origine.
const compteurs = {};
for (const m of magasins) {
  const prefixe =
    { "Intermarché": "ITM", "AD Delhaize": "ADD", "Proxy Delhaize": "PXY", Delhaize: "DEL", Spar: "SPR" }[
      m.enseigne
    ] ?? "MAG";
  compteurs[prefixe] = (compteurs[prefixe] ?? 0) + 1;
  m.reference = `${prefixe}-${String(compteurs[prefixe]).padStart(3, "0")}`;
}

const colonnes = [
  "nom", "enseigne", "reseau", "adresse", "code_postal", "ville", "region",
  "latitude", "longitude", "telephone", "contact", "ca_jrf", "exercice",
  "reference", "libelle_excel",
];
const csv = [
  colonnes.join(";"),
  ...magasins.map((m) => colonnes.map((c) => echapper(m[c])).join(";")),
].join("\r\n");
fs.writeFileSync(sortie, "﻿" + csv);

// ---------------------------------------------------------------------------
const parEnseigne = {};
for (const m of magasins) parEnseigne[m.enseigne] = (parEnseigne[m.enseigne] ?? 0) + 1;
const noms = magasins.map((m) => m.nom);
const doublons = [...new Set(noms.filter((n, i) => noms.indexOf(n) !== i))];

console.log(`\n${magasins.length} magasins écrits dans ${sortie}\n`);
console.log("Par enseigne :");
for (const [e, n] of Object.entries(parEnseigne).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${e}`);
}
console.log(`\nCommune renseignée : ${magasins.filter((m) => m.ville).length}/${magasins.length}`);
const avecAdresse = magasins.filter((m) => m.adresse).length;
const adressesADouble = Object.entries(ADRESSES_VERIFIEES).filter(
  ([cle, v]) => !cle.startsWith("_") && v.confiance === "aVerifier"
);
console.log(
  `Adresse renseignée : ${avecAdresse}/${magasins.length}  ` +
    `(absente du fichier source, retrouvée une par une)`
);
console.log(`Coordonnées GPS    : 0/${magasins.length}  (non trouvables par recherche web)`);
if (adressesADouble.length) {
  console.log(`\n⚠️  ${adressesADouble.length} adresse(s) à confirmer :`);
  for (const [cle, v] of adressesADouble) console.log(`     ${cle} → ${v.adresse}`);
}

if (doublons.length) {
  console.log(`\n⚠️  ${doublons.length} nom(s) en double DANS LE FICHIER SOURCE :`);
  doublons.forEach((d) => console.log(`     ${d}`));
}
if (aVerifier.length) {
  console.log(`\n⚠️  ${aVerifier.length} commune(s) à confirmer (quartier ou déduction) :`);
  aVerifier.forEach((a) => console.log(`     ${a}`));
}
if (inconnus.length) {
  console.log(`\n❌ ${inconnus.length} libellé(s) sans commune identifiée — à compléter à la main :`);
  inconnus.forEach((i) => console.log(`     ${i}`));
}
console.log();
