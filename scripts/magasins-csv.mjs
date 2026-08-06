/**
 * Lecture / écriture du CSV des magasins, et le rapport que les deux scripts
 * affichent en fin de course. Extrait ici pour qu'`extraire-magasins-excel.mjs`
 * et `completer-magasins-csv.mjs` produisent exactement le même fichier et le
 * même compte rendu.
 */

/** Colonnes du CSV importable, dans l'ordre attendu par l'écran Magasins. */
export const COLONNES = [
  "nom", "enseigne", "reseau", "adresse", "code_postal", "ville", "region",
  "latitude", "longitude", "telephone", "contact", "ca_jrf", "exercice",
  "reference", "libelle_excel",
];

/** Colonnes recalculées à chaque passage. Les autres sont conservées telles quelles. */
export const COLONNES_DERIVEES = [
  "nom", "enseigne", "reseau", "adresse", "code_postal", "ville", "region", "reference",
];

export function echapper(v) {
  const s = v == null ? "" : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Découpe une ligne CSV `;` en respectant les champs entre guillemets. */
export function decouper(ligne) {
  const champs = [];
  let courant = "";
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (dansGuillemets) {
      if (c === '"' && ligne[i + 1] === '"') {
        courant += '"';
        i++;
      } else if (c === '"') dansGuillemets = false;
      else courant += c;
    } else if (c === '"') dansGuillemets = true;
    else if (c === ";") {
      champs.push(courant);
      courant = "";
    } else courant += c;
  }
  champs.push(courant);
  return champs;
}

/**
 * Ce qui reste incertain après la conversion. Affiché à l'écran plutôt
 * qu'enfoui : ce sont les questions à poser à Gérardo avant l'import.
 */
export function rapport(
  magasins,
  adresses,
  { ecartes = [], inconnus = [], communesAConfirmer = [], sansReference = [] }
) {
  const avecAdresse = magasins.filter((m) => m.adresse).length;
  const aConfirmer = magasins.filter(
    (m) => adresses[m.libelle_excel.toUpperCase()]?.confiance === "aVerifier"
  );

  console.log(
    `Adresse renseignée : ${avecAdresse}/${magasins.length}  ` +
      `(absente du fichier source, retrouvée une par une)`
  );
  console.log(`  dont à confirmer : ${aConfirmer.length}`);
  console.log(`Coordonnées GPS    : 0/${magasins.length}  (non trouvables par recherche web)`);

  const sansAdresse = magasins.filter((m) => !m.adresse);
  if (sansAdresse.length) {
    console.log(`\n${sansAdresse.length} magasin(s) encore sans adresse :`);
    sansAdresse.forEach((m) => console.log(`     ${m.libelle_excel}  (${m.ville})`));
  }
  if (ecartes.length) {
    console.log(`\n${ecartes.length} ligne(s) du fichier source écartée(s) — doublons :`);
    ecartes.forEach((e) => console.log(`     ${e}`));
  }
  if (sansReference.length) {
    console.log(`\n⚠️  ${sansReference.length} magasin(s) absent(s) de la table des références figées :`);
    sansReference.forEach((s) => console.log(`     ${s}`));
  }
  if (aConfirmer.length) {
    console.log(`\n⚠️  ${aConfirmer.length} adresse(s) à confirmer avec Gérardo :`);
    aConfirmer.forEach((m) => console.log(`     ${m.libelle_excel} → ${m.adresse}`));
  }
  if (communesAConfirmer.length) {
    console.log(`\n⚠️  ${communesAConfirmer.length} commune(s) à confirmer (quartier ou déduction) :`);
    communesAConfirmer.forEach((c) => console.log(`     ${c}`));
  }
  if (inconnus.length) {
    console.log(`\n❌ ${inconnus.length} libellé(s) sans commune identifiée — à compléter à la main :`);
    inconnus.forEach((i) => console.log(`     ${i}`));
  }
  console.log();
}
