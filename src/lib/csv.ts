"use client";
/**
 * Export CSV lisible par l'Excel de l'utilisateur (Belgique francophone) :
 * séparateur point-virgule et BOM UTF-8, sinon les accents arrivent cassés
 * et tout le fichier se retrouve dans la colonne A.
 */
export type Colonne<T> = { entete: string; valeur: (ligne: T) => string | number | null };

function echapper(valeur: string | number | null): string {
  if (valeur === null) return "";
  const texte = String(valeur);
  return /[";\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export function versCsv<T>(lignes: T[], colonnes: Colonne<T>[]): string {
  const entetes = colonnes.map((c) => echapper(c.entete)).join(";");
  const corps = lignes.map((ligne) =>
    colonnes.map((c) => echapper(c.valeur(ligne))).join(";")
  );
  return [entetes, ...corps].join("\r\n");
}

export function telechargerCsv(nomFichier: string, contenu: string): void {
  const blob = new Blob([`﻿${contenu}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  lien.click();
  URL.revokeObjectURL(url);
}

/**
 * Le texte d'un fichier déposé, quel que soit son encodage.
 *
 * `File.text()` décode toujours en UTF-8. Or l'Excel d'un poste belge
 * enregistre ses CSV en Windows-1252 : les accents arrivent alors en `�`, et
 * un magasin sur deux cesse de concorder avec son nom en base. On décode donc
 * strictement en UTF-8 d'abord, et on retombe sur Windows-1252 si ça échoue.
 */
export function texteDe(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/**
 * Lecture d'un CSV réel : séparateur détecté (`;` d'un export Excel belge ou
 * `,`), guillemets gérés, BOM retiré. Un fichier de magasins contient des
 * adresses avec des virgules — un `split(",")` naïf décale toutes les colonnes
 * sans le dire, et l'erreur ne se voit qu'une fois les données en base.
 */
export function parseDelimited(texte: string): string[][] {
  const contenu = texte.replace(/^\uFEFF/, "");
  const premiereLigne = contenu.split(/\r?\n/, 1)[0] ?? "";
  const separateur =
    (premiereLigne.match(/;/g)?.length ?? 0) >= (premiereLigne.match(/,/g)?.length ?? 0) ? ";" : ",";

  const lignes: string[][] = [];
  let champ = "";
  let ligne: string[] = [];
  let dansGuillemets = false;

  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (contenu[i + 1] === '"') {
          champ += '"';
          i++;
        } else {
          dansGuillemets = false;
        }
      } else {
        champ += c;
      }
      continue;
    }
    if (c === '"') dansGuillemets = true;
    else if (c === separateur) {
      ligne.push(champ.trim());
      champ = "";
    } else if (c === "\n") {
      ligne.push(champ.trim());
      if (ligne.some((v) => v.length > 0)) lignes.push(ligne);
      ligne = [];
      champ = "";
    } else if (c !== "\r") {
      champ += c;
    }
  }
  ligne.push(champ.trim());
  if (ligne.some((v) => v.length > 0)) lignes.push(ligne);
  return lignes;
}
