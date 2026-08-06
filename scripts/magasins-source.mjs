/**
 * Tout ce qui INTERPRÈTE le fichier Excel de Gérardo : commune, enseigne, nom
 * affiché, doublons, référence. Une seule table par sujet, un seul endroit.
 *
 * Module séparé parce que DEUX scripts s'en servent :
 *   · extraire-magasins-excel.mjs   génère le CSV depuis l'Excel ;
 *   · completer-magasins-csv.mjs    remet à jour le CSV déjà produit, sans
 *     l'Excel (qui n'est pas dans le dépôt).
 *
 * Corriger une commune ou une enseigne ici la corrige dans les deux chemins.
 * Rien n'est corrigé en silence : chaque écart au fichier source est déclaré
 * dans une table nommée, et les scripts le rapportent à l'écran.
 */

import fs from "fs";

// ---------------------------------------------------------------------------
// 1. Communes. `sur` = d'où vient l'information.
//    "sure"    : commune et code postal certains.
//    "quartier": le libellé désigne un quartier, la commune a été identifiée.
//    "adeviner": commune plausible mais À VÉRIFIER avant usage terrain.
// ---------------------------------------------------------------------------
const C = (ville, cp, region, sur = "sure") => ({ ville, cp, region, sur });

export const COMMUNES = {
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
  // « INTERMARCHE ST LAMBERT BY » = les Galeries Saint-Lambert, à LIÈGE.
  // Il n'y a pas d'Intermarché à Woluwe-Saint-Lambert : l'hypothèse initiale
  // était fausse (vérifié sur intermarche.be et galeries-st-lambert.be).
  "ST LAMBERT": C("Liège", "4000", "wallonie", "quartier"),
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
  "ORCQ": C("Orcq", "7501", "wallonie"),
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
  "FRASNES LEZ GOSSELIES": C("Frasnes-lez-Gosselies", "6210", "wallonie"),
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
  // Le boulevard Prince de Liège est à Anderlecht, mais le magasin qui en porte
  // le nom est chaussée de Ninove, à Molenbeek-Saint-Jean (stores.delhaize.be).
  "PRINCE DE LIEGE": C("Molenbeek-Saint-Jean", "1080", "bruxelles", "quartier"),
  "ROODEBEEK": C("Woluwe-Saint-Lambert", "1200", "bruxelles", "quartier"),
  "SCHOTEN": C("Schoten", "2900", "flandre"),
  "SERAING": C("Seraing", "4100", "wallonie"),
  "TOURNAI": C("Tournai", "7500", "wallonie"),
  "UCCLE DEFRE": C("Uccle", "1180", "bruxelles", "quartier"),
  "VIRTON": C("Virton", "6760", "wallonie"),
  "WAASLAND": C("Sint-Niklaas", "9100", "flandre", "quartier"),
  "WATERLOO": C("Waterloo", "1410", "wallonie"),
  "WILRIJK": C("Wilrijk", "2610", "flandre"),
  "WONDELGEM -": C("Wondelgem", "9032", "flandre"),
  "ZEDELGEM": C("Zedelgem", "8210", "flandre"),
  "EVERE": C("Evere", "1140", "bruxelles"),
  "FERRIERES": C("Ferrières", "4190", "wallonie"),
  "WAREGEM": C("Sint-Eloois-Vijve", "8793", "flandre", "quartier"), // section de Waregem
  "ZWIJNAARDE": C("Zwijnaarde", "9052", "flandre"),
  "BELGRADE": C("Namur", "5001", "wallonie", "quartier"),
  "BEERZEL": C("Beerzel", "2580", "flandre"),
  "RECOGNE": C("Recogne", "6800", "wallonie", "quartier"), // section de Libramont-Chevigny
  "WANZE": C("Wanze", "4520", "wallonie"),
  "FORT JACO": C("Uccle", "1180", "bruxelles", "quartier"),
  "GENVAL": C("Genval", "1332", "wallonie"),
  // Le Delhaize « Croix de Guerre » est rue de Heembeek, à Neder-Over-Heembeek.
  "CROIX DE GUERRE": C("Neder-Over-Heembeek", "1120", "bruxelles", "quartier"),
  "LA LOUVIERE": C("La Louvière", "7100", "wallonie"),
  "HOEILLART": C("Hoeilaart", "1560", "flandre"),
  "WOLUWE ST LAMBERT": C("Woluwe-Saint-Lambert", "1200", "bruxelles"),
  "REER": C("Rumst", "2840", "flandre", "quartier"), // Reet est une section de Rumst
  "VISE": C("Visé", "4600", "wallonie"),
  "AARDOIE": C("Ardooie", "8850", "flandre"),
  "ZELE": C("Zele", "9240", "flandre"),
  "TORHOUT": C("Torhout", "8820", "flandre"),
  "AARTSELAAR": C("Aartselaar", "2630", "flandre"),
};

/** Retire le préfixe d'enseigne et le suffixe « BY … » pour isoler la localité. */
export function localite(libelle) {
  return libelle
    .toUpperCase()
    .replace(/^(INTERMARCHE|INTERMARECHE|AD DELHAIZE|AD|PROXY DELHAIZE|PROXY|DELHAIZE|SPAAR|SPAR)\s*/, "")
    .replace(/\s*BY( MESTDAGH| MESSTDAGH)?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// 2. Adresses, vérifiées une par une avec leur source.
//    Fichier séparé et cumulatif : la recherche des 185 adresses s'est faite
//    par lots, et chaque lot devait s'ajouter sans écraser le précédent.
//    Absente du JSON, la case reste VIDE. Une adresse inventée envoie un
//    commercial à la mauvaise porte — bien pire qu'une case vide, parce que
//    personne ne va la vérifier avant d'y être.
// ---------------------------------------------------------------------------
export const ADRESSES = JSON.parse(
  fs.readFileSync(new URL("./adresses-magasins.json", import.meta.url), "utf8")
);

// ---------------------------------------------------------------------------
// 3. Fautes de frappe du fichier source, appliquées au NOM affiché seulement.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 4. Enseigne annoncée ≠ enseigne réelle.
//    Sept lignes portent une enseigne que TOUTES les sources contredisent.
//    L'enjeu n'est pas cosmétique : l'enseigne détermine `reseau`
//    (affilié / intégré), donc le filtre de l'écran Magasins.
//    Chaque correction est sourcée dans `adresses-magasins.json`, à la même clé.
// ---------------------------------------------------------------------------
export const ENSEIGNES_CORRIGEES = {
  "AD DELHAIZE FERRIERES": "Proxy Delhaize", // stores.delhaize.be, pubeco, ferrieres.be
  "PROXY HOEILLART": "AD Delhaize", // pubeco, heures.be, mappy, 1207.be
  "DELHAIZE VISE": "AD Delhaize", // pubeco, heures.be
  "DELHAIZE AARDOIE": "AD Delhaize", // openingsuren.vlaanderen, buurtslagers
  "DELHAIZE ZELE": "AD Delhaize", // adzele.be (site du magasin), handelsgids
  "DELHAIZE TORHOUT": "AD Delhaize", // openingsuren.vlaanderen, handelsgids
  "DELHAIZE AARTSELAAR": "AD Delhaize", // adaartselaar.com, buurtsuper.be
};

// ---------------------------------------------------------------------------
// 5. Doublons du fichier source : deux lignes, un seul point de vente.
//    L'écran d'import ne déduplique pas — chaque ligne devient un magasin.
//    Un magasin fantôme n'est jamais visité, donc sa dette de visite monte
//    indéfiniment et il trône en tête des priorités. C'est exactement ce que
//    le produit est censé empêcher.
//    Valeur = le libellé CONSERVÉ, pour que la ligne écartée reste traçable.
//    Un libellé strictement répété (« AD WAREGEM », deux fois à l'identique)
//    est écarté par la règle générale : seule la première occurrence compte.
// ---------------------------------------------------------------------------
export const DOUBLONS = {
  // Même magasin, Clos Lucien Outers 1 à Auderghem. On garde le libellé complet.
  "AD HANKAR": "AD DELHAIZE HANKAR",
  // Même magasin, Rue de Nimy 117-121. On garde la ligne « NIMY » : sa commune
  // est la bonne (Nimy 7020), celle de la ligne « MONS » ne l'est pas (Mons 7000).
  "AD DELHAIZE MONS": "AD DELHAIZE NIMY - VAMODIS",
};

/** Enseigne + réseau déduits du libellé. « BY » = Intermarché by Mestdagh. */
export function enseigneEtReseau(libelle) {
  const corrigee = ENSEIGNES_CORRIGEES[libelle.toUpperCase()];
  if (corrigee) return [corrigee, corrigee === "Delhaize" ? "integre" : "affilie"];

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

/** « DELHAIZE ZELE » + « AD Delhaize » → « AD Delhaize Zele ». */
export function joliNom(libelle, enseigne) {
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

const PREFIXES = {
  "Intermarché": "ITM",
  "AD Delhaize": "ADD",
  "Proxy Delhaize": "PXY",
  "Delhaize": "DEL",
  "Spar": "SPR",
};

// ---------------------------------------------------------------------------
// 6. Références FIGÉES.
//    `stores.external_ref` est UNIQUE et les 185 lignes sont déjà en base
//    (import du 06/08/2026). Une référence recalculée à chaque passage n'est
//    pas une référence : corriger une enseigne renumérotait tout le bloc
//    suivant et cassait le lien avec la ligne déjà enregistrée.
//    Elles se lisent donc dans une table figée, jamais recalculées.
// ---------------------------------------------------------------------------
const FIGEES = JSON.parse(
  fs.readFileSync(new URL("./references-magasins.json", import.meta.url), "utf8")
);
export const REFERENCES = FIGEES.references;
/** Lignes déjà en base qui n'ont plus de magasin : à désactiver, pas à supprimer. */
export const REFERENCES_ECARTEES = FIGEES._ecartees;

/**
 * Applique toute l'interprétation à une liste ordonnée de libellés Excel et
 * renvoie les colonnes DÉRIVÉES de chaque magasin retenu, plus ce qu'il a fallu
 * écarter ou deviner. Les deux scripts passent par ici : c'est ce qui garantit
 * qu'ils produisent le même fichier.
 */
export function construireMagasins(libelles) {
  const magasins = [];
  const ecartes = [];
  const inconnus = [];
  const communesAConfirmer = [];
  const sansReference = [];
  const vus = new Set();

  for (const libelle of libelles) {
    const cle = libelle.toUpperCase();
    const [enseigne, reseau] = enseigneEtReseau(libelle);
    if (!enseigne) continue;

    if (DOUBLONS[cle]) {
      ecartes.push(`${libelle} → même magasin que « ${DOUBLONS[cle]} »`);
      continue;
    }
    if (vus.has(cle)) {
      ecartes.push(`${libelle} → ligne répétée à l'identique dans le fichier source`);
      continue;
    }
    vus.add(cle);

    const commune = COMMUNES[localite(libelle)];
    if (!commune?.ville) inconnus.push(libelle);
    else if (commune.sur !== "sure") communesAConfirmer.push(`${libelle} → ${commune.ville} (${commune.sur})`);

    // Référence figée. Un libellé absent de la table est un magasin que la base
    // ne connaît pas encore : il reçoit le premier numéro libre de son préfixe,
    // et le script le signale — c'est un ajout au parc, pas un détail.
    let reference = REFERENCES[cle];
    if (!reference) {
      const prefixe = PREFIXES[enseigne] ?? "MAG";
      const prises = new Set([
        ...Object.values(REFERENCES),
        ...magasins.map((m) => m.reference),
      ]);
      let rang = 1;
      while (prises.has(`${prefixe}-${String(rang).padStart(3, "0")}`)) rang++;
      reference = `${prefixe}-${String(rang).padStart(3, "0")}`;
      sansReference.push(`${libelle} → ${reference} (nouveau magasin)`);
    }

    magasins.push({
      nom: joliNom(libelle, enseigne),
      enseigne,
      reseau,
      adresse: ADRESSES[cle]?.adresse ?? "",
      code_postal: commune?.cp ?? "",
      ville: commune?.ville ?? "",
      region: commune?.region ?? "",
      reference,
      libelle_excel: libelle,
    });
  }

  return { magasins, ecartes, inconnus, communesAConfirmer, sansReference };
}
