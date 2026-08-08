/**
 * Lecture d'un classeur `.xlsx`, sans aucune dépendance.
 *
 * Pourquoi écrire ça plutôt qu'installer une bibliothèque : les deux
 * candidates courantes pèsent plusieurs centaines de kilo-octets compressées,
 * pour une application qui doit s'afficher en moins de deux secondes en 3G et
 * fonctionner hors ligne. Ici on lit UN format, celui du classeur qu'on
 * génère soi-même, et le navigateur fait tout le travail difficile :
 * `DecompressionStream` décompresse, il ne reste qu'à ouvrir l'archive.
 *
 * Un `.xlsx` est une archive ZIP contenant du XML :
 *   xl/workbook.xml            les feuilles et leur nom
 *   xl/_rels/workbook.xml.rels le nom → le fichier
 *   xl/sharedStrings.xml       toutes les chaînes, dédupliquées
 *   xl/styles.xml              les formats, dont on déduit ce qui est une date
 *   xl/worksheets/sheetN.xml   les cellules
 *
 * Ce que ça permet et que le CSV ne permettait pas : aller chercher la feuille
 * PAR SON NOM. Dans Excel, « Enregistrer sous → CSV » n'exporte que la feuille
 * active — un classeur à cinq feuilles finit tôt ou tard par arriver sous la
 * forme de la liste des magasins.
 */

// ---------------------------------------------------------------------------
// 1. L'archive ZIP
// ---------------------------------------------------------------------------

/** Fin du répertoire central : la signature à chercher en remontant. */
const EOCD = 0x06054b50;

const hexa = (octets: Uint8Array, n: number) =>
  [...octets.subarray(0, n)].map((o) => o.toString(16).padStart(2, "0")).join(" ");

const debute = (o: Uint8Array, ...signature: number[]) =>
  signature.every((s, i) => o[i] === s);

/**
 * Ce qu'on a reçu, décidé sur le CONTENU et jamais sur l'extension.
 *
 * Un fichier arrive renommé, sans extension, ou avec la mauvaise plus souvent
 * qu'on ne le croit — et sur téléphone, ce que rend le sélecteur de fichiers
 * n'a pas toujours grand-chose à voir avec ce que l'utilisateur croit avoir
 * choisi. Les formats qu'on sait nommer sont refusés en le disant : un message
 * « fichier invalide » ne laisse qu'une chose à faire, réessayer à l'identique.
 */
export function natureDuFichier(buffer: ArrayBuffer): "classeur" | "texte" {
  const o = new Uint8Array(buffer);
  if (o.length === 0)
    throw new Error(
      "Le fichier est vide (0 octet). S'il vient d'un cloud (OneDrive, Drive, iCloud), " +
        "ouvre-le une fois pour le télécharger sur l'appareil, puis réessaie."
    );
  if (debute(o, 0x50, 0x4b)) return "classeur";
  if (debute(o, 0xd0, 0xcf, 0x11, 0xe0))
    throw new Error(
      "C'est un ancien format Excel (.xls). Ouvre-le dans Excel et enregistre-le en .xlsx " +
        "(Fichier → Enregistrer sous → « Classeur Excel »)."
    );
  if (debute(o, 0x25, 0x50, 0x44, 0x46))
    throw new Error("C'est un PDF, pas un classeur Excel ni un CSV.");
  if (debute(o, 0x89, 0x50, 0x4e, 0x47) || debute(o, 0xff, 0xd8, 0xff))
    throw new Error("C'est une image, pas un classeur Excel ni un CSV.");
  return "texte";
}

async function inflate(donnees: Uint8Array, methode: number): Promise<Uint8Array> {
  if (methode === 0) return donnees; // stocké tel quel
  if (methode !== 8) throw new Error(`Compression ZIP non gérée : ${methode}`);
  const flux = new Blob([donnees as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

/** Ouvre l'archive et renvoie chaque fichier, décompressé, indexé par son nom. */
export async function ouvrirZip(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const vue = new DataView(buffer);
  const octets = new Uint8Array(buffer);

  // Le répertoire central se trouve à la fin, après un commentaire de taille
  // variable : on remonte jusqu'à la signature.
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= 0 && i > buffer.byteLength - 65558; i--) {
    if (vue.getUint32(i, true) === EOCD) {
      eocd = i;
      break;
    }
  }
  // On sait déjà que le fichier commence par « PK » : s'il n'a pas de fin de
  // répertoire central, c'est une archive tronquée — typiquement un transfert
  // interrompu ou un fichier encore en cours de synchronisation.
  if (eocd < 0)
    throw new Error(
      `Le classeur est incomplet ou abîmé (${octets.length} octets, ` +
        `commençant par ${hexa(octets, 4)}). Retélécharge-le et réessaie.`
    );

  const nombre = vue.getUint16(eocd + 10, true);
  let position = vue.getUint32(eocd + 16, true);
  const fichiers = new Map<string, Uint8Array>();
  const decodeur = new TextDecoder();

  for (let i = 0; i < nombre; i++) {
    const methode = vue.getUint16(position + 10, true);
    const tailleCompressee = vue.getUint32(position + 20, true);
    const longueurNom = vue.getUint16(position + 28, true);
    const longueurExtra = vue.getUint16(position + 30, true);
    const longueurCommentaire = vue.getUint16(position + 32, true);
    const debutLocal = vue.getUint32(position + 42, true);
    const nom = decodeur.decode(octets.subarray(position + 46, position + 46 + longueurNom));

    // L'en-tête local répète les longueurs, qui peuvent différer de celles du
    // répertoire central : c'est lui qui dit où commencent vraiment les données.
    const nomLocal = vue.getUint16(debutLocal + 26, true);
    const extraLocal = vue.getUint16(debutLocal + 28, true);
    const debutDonnees = debutLocal + 30 + nomLocal + extraLocal;

    fichiers.set(
      nom,
      await inflate(octets.subarray(debutDonnees, debutDonnees + tailleCompressee), methode)
    );
    position += 46 + longueurNom + longueurExtra + longueurCommentaire;
  }
  return fichiers;
}

// ---------------------------------------------------------------------------
// 2. Le XML
// ---------------------------------------------------------------------------

const ENTITES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'",
};

function desechapper(texte: string): string {
  return texte
    .replace(/&(amp|lt|gt|quot|apos);/g, (e) => ENTITES[e])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

const attribut = (balise: string, nom: string): string =>
  balise.match(new RegExp(`\\s${nom}="([^"]*)"`))?.[1] ?? "";

/** Tout le texte des `<t>` d'un fragment — une chaîne enrichie en compte plusieurs. */
const texteDes = (fragment: string): string =>
  [...fragment.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => desechapper(m[1])).join("");

// ---------------------------------------------------------------------------
// 3. Les dates
// ---------------------------------------------------------------------------

/** Formats de date intégrés à Excel, qui n'apparaissent pas dans `numFmts`. */
const FORMATS_DATE_INTEGRES = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47]);

/**
 * Excel compte les jours depuis le 30/12/1899 — décalage volontaire, il
 * reproduit un bug de Lotus 1-2-3 qui croyait 1900 bissextile.
 */
function depuisSerie(serie: number): Date {
  return new Date(Math.round((serie - 25569) * 86_400_000));
}

const deuxChiffres = (n: number) => String(n).padStart(2, "0");

/**
 * Une valeur numérique formatée en date devient le texte que l'import attend
 * déjà : « JJ/MM/AAAA », ou « HH:MM » si la valeur est inférieure à un jour.
 * On ne crée pas un second chemin d'analyse — `lireDate` et `lireHeure` sont
 * déjà écrits et testés.
 */
function formaterDate(serie: number): string {
  const d = depuisSerie(serie);
  if (serie < 1) return `${deuxChiffres(d.getUTCHours())}:${deuxChiffres(d.getUTCMinutes())}`;
  return `${deuxChiffres(d.getUTCDate())}/${deuxChiffres(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Pour chaque style, dit si les nombres qu'il habille sont des dates. */
function stylesDate(xml: string): boolean[] {
  const personnalises = new Map<number, string>();
  for (const m of xml.matchAll(/<numFmt[^>]*\/>/g)) {
    personnalises.set(Number(attribut(m[0], "numFmtId")), attribut(m[0], "formatCode"));
  }
  const bloc = xml.match(/<cellXfs[\s\S]*?<\/cellXfs>/)?.[0] ?? "";
  return [...bloc.matchAll(/<xf[^>]*>/g)].map((m) => {
    const id = Number(attribut(m[0], "numFmtId") || "0");
    if (FORMATS_DATE_INTEGRES.has(id)) return true;
    const code = personnalises.get(id) ?? "";
    // Un format de date contient forcément un jour, un mois ou une année —
    // en retirant ce qui est entre guillemets, qui est du texte libre.
    return /[dmyh]/i.test(code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, ""));
  });
}

/** « B12 » → 1 (colonne B). Les cellules vides sont absentes du XML. */
function indiceColonne(reference: string): number {
  const lettres = reference.match(/^[A-Z]+/)?.[0] ?? "A";
  let n = 0;
  for (const c of lettres) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}

// ---------------------------------------------------------------------------
// 4. L'entrée publique
// ---------------------------------------------------------------------------

/**
 * Lit une feuille et renvoie ses lignes, exactement comme `parseDelimited`
 * renvoie celles d'un CSV : la suite du traitement ne sait pas d'où ça vient.
 *
 * `nomFeuille` est cherché sans tenir compte de la casse ni des accents. Sans
 * correspondance, on prend la première feuille — un fichier venu d'ailleurs
 * reste lisible.
 */
export async function lireXlsx(
  buffer: ArrayBuffer,
  nomFeuille?: string,
  /** Reçoit les noms de feuilles et celle retenue — de quoi expliquer un échec. */
  rapport?: (info: { feuilles: string[]; retenue: string }) => void
): Promise<string[][]> {
  const fichiers = await ouvrirZip(buffer);
  const decodeur = new TextDecoder();
  const lire = (nom: string) => {
    const f = fichiers.get(nom);
    return f ? decodeur.decode(f) : "";
  };

  const relations = new Map<string, string>();
  for (const m of lire("xl/_rels/workbook.xml.rels").matchAll(/<Relationship[^>]*\/>/g)) {
    relations.set(attribut(m[0], "Id"), attribut(m[0], "Target"));
  }

  const simplifier = (v: string) =>
    v.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const feuilles = [...lire("xl/workbook.xml").matchAll(/<sheet[^>]*\/>/g)].map((m) => ({
    nom: desechapper(attribut(m[0], "name")),
    cible: relations.get(attribut(m[0], "r:id")) ?? "",
  }));
  if (feuilles.length === 0) throw new Error("Ce classeur ne contient aucune feuille.");

  const voulue = nomFeuille
    ? (feuilles.find((f) => simplifier(f.nom) === simplifier(nomFeuille)) ?? feuilles[0])
    : feuilles[0];
  rapport?.({ feuilles: feuilles.map((f) => f.nom), retenue: voulue.nom });
  const chemin = voulue.cible.replace(/^\/?(xl\/)?/, "xl/");

  const chaines = [...lire("xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    texteDes(m[1])
  );
  const estDate = stylesDate(lire("xl/styles.xml"));

  const lignes: string[][] = [];
  for (const ligne of lire(chemin).matchAll(/<row([^>]*)>([\s\S]*?)<\/row>/g)) {
    const cellules: string[] = [];
    for (const c of ligne[2].matchAll(/<c([^>]*)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const corps = c[2] ?? "";
      const type = attribut(`<c${attrs}>`, "t");
      const style = Number(attribut(`<c${attrs}>`, "s") || "0");
      const brut = desechapper(corps.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");

      let valeur: string;
      if (type === "s") valeur = chaines[Number(brut)] ?? "";
      else if (type === "inlineStr") valeur = texteDes(corps);
      else if (type === "str") valeur = brut;
      else if (brut && estDate[style]) valeur = formaterDate(Number(brut));
      else valeur = brut;

      cellules[indiceColonne(attribut(`<c${attrs}>`, "r"))] = valeur;
    }
    // Une ligne entièrement vide n'existe pas dans le XML. On la remet à sa
    // place d'après `r`, sans quoi le rang renvoyé ne serait plus celui
    // qu'Excel affiche — et le numéro de ligne montré à Gérardo pour corriger
    // une erreur désignerait la mauvaise.
    const rang = Number(attribut(`<row${ligne[1]}>`, "r") || "0");
    lignes[rang > 0 ? rang - 1 : lignes.length] = Array.from(cellules, (v) => v ?? "");
  }
  return Array.from(lignes, (l) => l ?? []);
}
