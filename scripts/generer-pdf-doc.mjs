#!/usr/bin/env node
/**
 * Rend un document HTML de `docs/` en PDF, via le Chromium déjà installé.
 *
 * Même principe que les feuilles de route et le rapport magasin : aucune
 * bibliothèque de génération de PDF. La source reste le HTML, versionné et
 * modifiable ; le PDF n'est qu'une sortie.
 *
 * Playwright n'est pas une dépendance du projet — il n'est utilisé que par cet
 * outil de fabrication, jamais par l'application. Installer si nécessaire :
 *   npm install --no-save playwright
 *
 * Usage : node scripts/generer-pdf-doc.mjs docs/questions-it.html
 */

import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const source = process.argv[2];
if (!source) {
  console.error("Usage : node scripts/generer-pdf-doc.mjs <fichier.html>");
  process.exit(1);
}
const sortie = source.replace(/\.html$/, ".pdf");

const navigateur = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await navigateur.newPage();
await page.goto(`file://${path.resolve(source)}`, { waitUntil: "networkidle" });
await page.pdf({ path: sortie, format: "A4", printBackground: true });
await navigateur.close();

const ko = Math.round(fs.statSync(sortie).size / 1024);
console.log(`\n${sortie} écrit (${ko} Ko)\n`);
