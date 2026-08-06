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
