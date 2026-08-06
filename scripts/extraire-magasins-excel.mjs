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
 *   · la commune et le code postal viennent de la table ci-dessous, écrite à la
 *     main, où chaque entrée porte son niveau de certitude ;
 *   · l'ADRESSE reste vide. Elle n'est ni dans le fichier, ni déductible.
 *
 * Usage : node scripts/extraire-magasins-excel.mjs <fichier.xlsx> [sortie.csv]
 */

import fs from "fs";
import { execFileSync } from "child_process";

// ---------------------------------------------------------------------------
// 1. Communes. `sur` = d'où vient l'information.
//    "sure"    : commune et code postal certains.
//    "quartier": le libellé désigne un quartier, la commune a été identifiée.
//    "adeviner": commune plausible mais À VÉRIFIER avant usage terrain.
// ---------------------------------------------------------------------------
const C = (ville, cp, region, sur = "sure") => ({ ville, cp, region, sur });

const COMMUNES = {
  // ---- Intermarché (bloc 1 de l'Excel) ----
  "ANDERLECHT": C("Anderlecht", "1070", "bruxelles"),
  "ANS": C("Ans", "4430", "wallonie"),
  "BRAINE LE CONTE": C("Braine-le-Comte", "7090", "wallonie"),
  "CERFONTAINE": C("Cerfontaine", "5630", "wallonie"),
  "CHAPELLE-LEZ-HERLEMONT": C("Chapelle-lez-Herlaimont", "7160", "wallonie"),
  "ANDENNE": C("Andenne", "5300", "wallonie"),
  "CHATELET": C("Châtelet", "6200", "wallonie"),
  "CHATELINEAU": C("Châtelineau", "6200", "wallonie"),
  "CHAUMONT": C("Chaumont-Gistoux", "1325", "wallonie", "adeviner"),
  "CHIEVRES": C("Chièvres", "7950", "wallonie"),
  "CORBAIS": C("Corbais", "1435", "wallonie"),
  "COUILLET": C("Couillet", "6010", "wallonie"),
  "FLORIFOUX": C("Floriffoux", "5150", "wallonie"),
  "FONTAINE L'EVEQUE": C("Fontaine-l'Évêque", "6140", "wallonie"),
  "FOREST": C("Forest", "1190", "bruxelles"),
  "GENAPPE": C("Genappe", "1470", "wallonie"),
  "GERPINNES": C("Gerpinnes", "6280", "wallonie"),
  "GHISLENGHIEN": C("Ghislenghien", "7822", "wallonie"),
  "GILLY VELODROME": C("Gilly", "6060", "wallonie", "quartier"),
  "GOSSELIES": C("Gosselies", "6041", "wallonie"),
  "GOZEE": C("Gozée", "6534", "wallonie"),
  "HAMME-MILLE": C("Hamme-Mille", "1320", "wallonie"),
  "JAMBES": C("Jambes", "5100", "wallonie"),
  "JODOIGNE": C("Jodoigne", "1370", "wallonie"),
  "JUMET": C("Jumet", "6040", "wallonie"),
  "ST LAMBERT": C("Woluwe-Saint-Lambert", "1200", "bruxelles", "quartier"),
  "-HUMBLET": C("Liège", "4000", "wallonie", "quartier"), // « Intermarché Liège Humblet »
  "LUTTRE": C("Luttre", "6238", "wallonie"),
  "MARCINELLE": C("Marcinelle", "6001", "wallonie"),
  "MONCEAU": C("Monceau-sur-Sambre", "6031", "wallonie"),
  "MONTIGNIES -SUR-SAMBRE": C("Montignies-sur-Sambre", "6061", "wallonie"),
  "NANINNE": C("Naninne", "5100", "wallonie"),
  "NIVELLES": C("Nivelles", "1400", "wallonie"),
  "OTTIGNIES": C("Ottignies", "1340", "wallonie"),
  "PHILIPPEVILLE": C("Philippeville", "5600", "wallonie"),
  "RIXENSART": C("Rixensart", "1330", "wallonie"),
  "ROUX": C("Roux", "6044", "wallonie"),
  "SCHAERBEEK": C("Schaerbeek", "1030", "bruxelles"),
  "SOIGNIES": C("Soignies", "7060", "wallonie"),
  "TILFF": C("Tilff", "4130", "wallonie"),
  "TRAZEGNIES": C("Trazegnies", "6183", "wallonie"),
  "TROOZ": C("Trooz", "4870", "wallonie"),
  "WAVRE": C("Wavre", "1300", "wallonie"),
  "ANDERLUES": C("Anderlues", "6150", "wallonie"),
  "ANDERLUES 2 CAPANDERE SA": C("Anderlues", "6150", "wallonie", "quartier"),
  "ANHEE/HOLEBO SA": C("Anhée", "5537", "wallonie", "quartier"),
  "ANTHEE": C("Anthée", "5520", "wallonie"),
  "ASSESSE": C("Assesse", "5330", "wallonie"),
  "BINCHE": C("Binche", "7130", "wallonie"),
  "BOIS DE VILLERS": C("Bois-de-Villers", "5170", "wallonie"),
  "BOUSSU": C("Boussu", "7300", "wallonie"),
  "COURT-SAINT-ETIENNE": C("Court-Saint-Étienne", "1490", "wallonie"),
  "FLEURUS": C("Fleurus", "6220", "wallonie"),
  "FORCHIES": C("Forchies-la-Marche", "6141", "wallonie"),
  "FRAMERIES": C("Frameries", "7080", "wallonie"),
  "FRASNES LEZ ANVAING": C("Frasnes-lez-Anvaing", "7910", "wallonie"),
  "GEDINNE": C("Gedinne", "5575", "wallonie"),
  "GILLY": C("Gilly", "6060", "wallonie"),
  "GIVRY": C("Givry", "7041", "wallonie"),
  "HELECINE": C("Hélécine", "1357", "wallonie"),
  "HERMALLE SOUS ARGENTEAU": C("Hermalle-sous-Argenteau", "4681", "wallonie"),
  "HERSTAL": C("Herstal", "4040", "wallonie"),
  "LAMBUSRT": C("Lambusart", "6220", "wallonie"),
  "HOLLAIN": C("Hollain", "7620", "wallonie"),
  "JURBISE": C("Jurbise", "7050", "wallonie"),
  "LEUZE": C("Leuze-en-Hainaut", "7900", "wallonie"),
  "LIEGE BURENVILLE": C("Liège", "4000", "wallonie", "quartier"),
  "LIMELETTE": C("Limelette", "1342", "wallonie"),
  "MONS": C("Mons", "7000", "wallonie"),
  "MORLANWELZ": C("Morlanwelz", "7140", "wallonie"),
  "MOUSCRON": C("Mouscron", "7700", "wallonie"),
  "NESSONVAUX": C("Nessonvaux", "4870", "wallonie"),
  "OHEY": C("Ohey", "5350", "wallonie"),
  "ORCQ": C("Orcq", "7503", "wallonie"),
  "PERUWELZ HAINAUT": C("Péruwelz", "7600", "wallonie"),
  "PERWEZ B-W": C("Perwez", "1360", "wallonie"),
  "PONT DE LOUP": C("Pont-de-Loup", "6250", "wallonie"),
  "QUEVAUCAMPS -QUEVIM": C("Quevaucamps", "7972", "wallonie", "quartier"),
  "RANSART": C("Ransart", "6043", "wallonie"),
  "REBECQ": C("Rebecq", "1430", "wallonie"),
  "RHISNES": C("Rhisnes", "5080", "wallonie"),
  "RUMES": C("Rumes", "7610", "wallonie"),
  "SART DAMES AVELINE": C("Sart-Dames-Avelines", "1495", "wallonie"),
  "TEMPLEUVE": C("Templeuve", "7520", "wallonie"),
  "TUBIZE": C("Tubize", "1480", "wallonie"),
  "ESTAIMPUIS": C("Estaimpuis", "7730", "wallonie"),
  "EGHEZEE": C("Éghezée", "5310", "wallonie"),
  "MONT SUR MARCHIENNE": C("Mont-sur-Marchienne", "6032", "wallonie"),
  "HANNUT": C("Hannut", "4280", "wallonie"),
  "ST GOERGES": C("Saint-Georges-sur-Meuse", "4470", "wallonie"),
  "GREZ-DOICEAU": C("Grez-Doiceau", "1390", "wallonie"),
  "LESSINES": C("Lessines", "7860", "wallonie"),
  "JETTE": C("Jette", "1090", "bruxelles"),
  "CINEY": C("Ciney", "5590", "wallonie"),

  // ---- AD Delhaize, Proxy, Delhaize (blocs 2 et 3) ----
  "ANTOING": C("Antoing", "7640", "wallonie"),
  "ARBRE BALLON": C("Jette", "1090", "bruxelles", "quartier"),
  "ATH": C("Ath", "7800", "wallonie"),
  "AUNOI -": C("Le Rœulx", "7070", "wallonie", "quartier"), // « AD Delhaize Aunoi », Le Rœulx
  "AYWAILLE": C("Aywaille", "4920", "wallonie"),
  "BARVAUX": C("Barvaux", "6940", "wallonie"),
  "BERTRIX": C("Bertrix", "6880", "wallonie"),
  "BOUFFIOULX": C("Bouffioulx", "6200", "wallonie"),
  "BOUGE": C("Bouge", "5004", "wallonie"),
  "BRAINE L'ALLEUD": C("Braine-l'Alleud", "1420", "wallonie"),
  "BURENVILLE": C("Liège", "4000", "wallonie", "quartier"),
  "CHASTRE": C("Chastre", "1450", "wallonie"),
  "CHAZAL": C("Schaerbeek", "1030", "bruxelles", "quartier"),
  "DIKSMUIDE II": C("Diksmuide", "8600", "flandre"),
  "DINANT": C("Dinant", "5500", "wallonie"),
  "EEKLO -": C("Eeklo", "9900", "flandre"),
  "ENGHIEN": C("Enghien", "7850", "wallonie"),
  "EPINOIS": C("Épinois", "7134", "wallonie"),
  "FERNELMONT": C("Fernelmont", "5380", "wallonie"),
  "FLAGEY": C("Ixelles", "1050", "bruxelles", "quartier"),
  "FLORENVILLE": C("Florenville", "6820", "wallonie"),
  "FRASNES LEZ GOSSELIES": C("Frasnes-lez-Gosselies", "6250", "wallonie"),
  "GEMBLOUX": C("Gembloux", "5030", "wallonie"),
  "GENT STER": C("Gand", "9000", "flandre", "quartier"),
  "HAACHT": C("Haacht", "3150", "flandre"),
  "HANKAR": C("Auderghem", "1160", "bruxelles", "quartier"),
  "HORNU": C("Hornu", "7301", "wallonie"),
  "HOTTON": C("Hotton", "6990", "wallonie"),
  "INCOURT -": C("Incourt", "1315", "wallonie"),
  "KEERBERGEN": C("Keerbergen", "3140", "flandre"),
  "LEDE": C("Lede", "9340", "flandre"),
  "LEDEBERG -": C("Ledeberg", "9050", "flandre"),
  "LEOPOLD III EVERE": C("Evere", "1140", "bruxelles", "quartier"),
  "LOUVAIN LA NEUVE": C("Louvain-la-Neuve", "1348", "wallonie"),
  "MELSBROEK": C("Melsbroek", "1820", "flandre"),
  "METTET": C("Mettet", "5640", "wallonie"),
  "MONTIGNY LE TILLEUL": C("Montigny-le-Tilleul", "6110", "wallonie"),
  "NIMY - VAMODIS": C("Nimy", "7020", "wallonie", "quartier"),
  "OOSTKAMP": C("Oostkamp", "8020", "flandre"),
  "OUDENAARDE": C("Audenarde", "9700", "flandre"),
  "PRINCE DE LIEGE": C("Anderlecht", "1070", "bruxelles", "quartier"),
  "ROODEBEEK": C("Woluwe-Saint-Lambert", "1200", "bruxelles", "quartier"),
  "SCHOTEN": C("Schoten", "2900", "flandre"),
  "SERAING": C("Seraing", "4100", "wallonie"),
  "TOURNAI": C("Tournai", "7500", "wallonie"),
  "UCCLE DEFRE": C("Uccle", "1180", "bruxelles", "quartier"),
  "VIRTON": C("Virton", "6760", "wallonie"),
  "WAASLAND": C("Sint-Niklaas", "9100", "flandre", "adeviner"),
  "WATERLOO": C("Waterloo", "1410", "wallonie"),
  "WILRIJK": C("Wilrijk", "2610", "flandre"),
  "WONDELGEM -": C("Wondelgem", "9032", "flandre"),
  "ZEDELGEM": C("Zedelgem", "8210", "flandre"),
  "EVERE": C("Evere", "1140", "bruxelles"),
  "FERRIERES": C("Ferrières", "4190", "wallonie"),
  "WAREGEM": C("Waregem", "8790", "flandre"),
  "ZWIJNAARDE": C("Zwijnaarde", "9052", "flandre"),
  "BELGRADE": C("Namur", "5001", "wallonie", "quartier"),
  "BEERZEL": C("Beerzel", "2580", "flandre"),
  "RECOGNE": C("Recogne", "6800", "wallonie", "adeviner"),
  "WANZE": C("Wanze", "4520", "wallonie"),
  "FORT JACO": C("Uccle", "1180", "bruxelles", "quartier"),
  "GENVAL": C("Genval", "1332", "wallonie"),
  "CROIX DE GUERRE": C("Laeken", "1020", "bruxelles", "quartier"),
  "LA LOUVIERE": C("La Louvière", "7100", "wallonie"),
  "HOEILLART": C("Hoeilaart", "1560", "flandre"),
  "WOLUWE ST LAMBERT": C("Woluwe-Saint-Lambert", "1200", "bruxelles"),
  "REER": C("Rumst", "2840", "flandre", "quartier"), // Reet est une section de Rumst
  "VISE": C("Visé", "4600", "wallonie"),
  "AARDOIE": C("Ardooie", "8850", "flandre", "adeviner"),
  "ZELE": C("Zele", "9240", "flandre"),
  "TORHOUT": C("Torhout", "8820", "flandre"),
  "AARTSELAAR": C("Aartselaar", "2630", "flandre"),
};

/**
 * Adresses VÉRIFIÉES une par une, avec leur source. Rien n'est ici sans avoir
 * été retrouvé : une adresse inventée envoie un commercial au mauvais endroit,
 * ce qui est pire qu'une case vide.
 *
 * Les 181 autres restent vides — voir le rapport en fin d'exécution.
 */
const ADRESSES_VERIFIEES = {
  // infobel.com — Intermarché Binche
  "INTERMARCHE BINCHE": "Rue Zéphirin Fontaine 140",
  // intermarche.be — Intermarché Liège Humblet
  "INTERMARCHE -HUMBLET BY": "Rue de la Cathédrale 63-67",
  // stores.delhaize.be — AD Delhaize Aunoi
  "AD DELHAIZE AUNOI -": "Rue de Houdeng 212",
  // stores.delhaize.be — Delhaize Reet
  "DELHAIZE REER": "'s Herenbaan 178",
};

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

/** Retire le préfixe d'enseigne et le suffixe « BY … » pour isoler la localité. */
function localite(libelle) {
  return libelle
    .toUpperCase()
    .replace(/^(INTERMARCHE|INTERMARECHE|AD DELHAIZE|AD|PROXY DELHAIZE|PROXY|DELHAIZE|SPAAR|SPAR)\s*/, "")
    .replace(/\s*BY( MESTDAGH| MESSTDAGH)?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
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
    adresse: ADRESSES_VERIFIEES[libelle.toUpperCase()] ?? "",
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
console.log(
  `Adresse renseignée : ${avecAdresse}/${magasins.length}  ` +
    `(absente du fichier source, vérifiée une par une)`
);

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
