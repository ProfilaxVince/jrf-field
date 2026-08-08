#!/usr/bin/env node
/**
 * Produit `docs/modele-passages.xlsx` — le classeur remis à l'informatique de
 * Jacques Remy pour qu'elle y dépose les passages effectués.
 *
 * Principe, demandé par Vincent le 07/08/2026 : **rien à taper ni à chercher**.
 * Trois listes déroulantes — la date, le magasin, le commercial — et le reste
 * se remplit tout seul. Une saisie par sélection ne peut pas produire un nom
 * mal orthographié ni une référence inexistante : la moitié des motifs de refus
 * de l'import disparaît à la source.
 *
 * ⚠️ Le classeur ne pré-remplit PAS ce que Gérardo avait planifié. On cocherait
 * ce qui est proposé au lieu de rapporter ce qui a eu lieu, et le fichier
 * deviendrait parfait et faux. La semaine prévue n'y figure pas du tout.
 *
 * À régénérer quand le parc ou l'équipe changent :
 *   node scripts/generer-modele-passages.mjs
 */

import fs from "fs";
import { execFileSync } from "child_process";
import { decouper } from "./magasins-csv.mjs";

const CSV = "supabase/manual/magasins-reels.csv";
const SORTIE = "docs/modele-passages.xlsx";

/**
 * L'équipe. Écrite ici et non lue en base : ce script tourne hors ligne, et
 * cinq surnoms qui changent une fois par an ne valent pas une connexion.
 * À corriger ici quand l'équipe bouge, puis régénérer.
 */
const COMMERCIAUX = ["Gerardo", "Guilio", "Page", "Michou", "Tony", "Laura"];

const lignes = fs
  .readFileSync(CSV, "utf8")
  .replace(/^﻿/, "")
  .split(/\r?\n/)
  .filter(Boolean);
const entetes = decouper(lignes[0]);
const idx = Object.fromEntries(entetes.map((c, i) => [c, i]));

// « ITM-001 — Intermarché Anderlecht » : la référence EN TÊTE, pour que
// l'import la retrouve sans dépendre du nom, et le nom derrière pour que
// l'humain sache ce qu'il choisit.
const magasins = lignes.slice(1).map((l) => {
  const c = decouper(l);
  return {
    libelle: `${c[idx.reference]} — ${c[idx.nom]}`,
    reference: c[idx.reference],
    nom: c[idx.nom],
    cp: c[idx.code_postal],
    ville: c[idx.ville],
  };
});

const script = `
import json, sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter

d = json.loads(sys.argv[1])
wb = Workbook()

VERT  = PatternFill("solid", fgColor="1B5E3F")
GRIS  = PatternFill("solid", fgColor="8A9A92")
CLAIR = PatternFill("solid", fgColor="F4F7F5")
BLANC = Font(color="FFFFFF", bold=True)
LIGNES_A_REMPLIR = 120

# ---- Feuille « Magasins » : la source de la liste déroulante ---------------
mg = wb.create_sheet("Magasins")
for i, titre in enumerate(["magasin", "reference", "nom", "code_postal", "ville"], start=1):
    c = mg.cell(row=1, column=i, value=titre); c.fill = VERT; c.font = BLANC
for r, m in enumerate(d["magasins"], start=2):
    mg.cell(row=r, column=1, value=m["libelle"])
    mg.cell(row=r, column=2, value=m["reference"])
    mg.cell(row=r, column=3, value=m["nom"])
    mg.cell(row=r, column=4, value=m["cp"])
    mg.cell(row=r, column=5, value=m["ville"])
mg.freeze_panes = "A2"
for lettre, largeur in (("A", 46), ("B", 14), ("C", 34), ("D", 13), ("E", 22)):
    mg.column_dimensions[lettre].width = largeur
dernier_magasin = len(d["magasins"]) + 1

# ---- Feuille « Équipe » ----------------------------------------------------
eq = wb.create_sheet("Equipe")
c = eq.cell(row=1, column=1, value="commercial"); c.fill = VERT; c.font = BLANC
for r, nom in enumerate(d["commerciaux"], start=2):
    eq.cell(row=r, column=1, value=nom)
eq.column_dimensions["A"].width = 24
dernier_commercial = len(d["commerciaux"]) + 1

# ---- Feuille « Période » : les dates offertes à la saisie ------------------
# Ancrée sur la DATE D'ENVOI, pas sur un lundi. Le cycle réel est jeudi →
# jeudi : il chevauche deux semaines civiles, et une liste lundi→dimanche
# laisserait la moitié des jours hors du choix. On remonte donc 21 jours en
# arrière depuis l'envoi — les 8 du cycle, plus la marge qu'il faut pour
# corriger une semaine passée.
#
# ⚠️ La date d'ancrage ne se TAPE PLUS : elle vaut =AUJOURDHUI().
# Vincent, 08/08/2026 : il avait saisi le jeudi et la feuille affichait lundi.
# Ce n'était pas un défaut d'affichage — la cellule contenait réellement un
# lundi. Saisir une date à la main sur un téléphone dépend de la langue du
# système, de l'ordre jour/mois et du clavier : ça se trompe, et RIEN ne le
# disait. Une date calculée ne se trompe pas, et l'IT remplit le jour où elle
# envoie. La cellule reste modifiable pour le cas où elle remplit en retard,
# mais elle est alors contrôlée juste à côté.
JOURS_OFFERTS = 21
sm = wb.create_sheet("Periode")
sm["A1"] = "Date de référence :"
sm["A1"].font = Font(bold=True)
sm["B1"] = "=TODAY()"
sm["B1"].fill = CLAIR
sm["B1"].number_format = "DD/MM/YYYY"
# Le jour en toutes lettres, par FORMAT et non par TEXT() : la langue des
# formules Excel change avec la version installée, un format ne change pas.
sm["C1"] = "=\$B\$1"
sm["C1"].number_format = "dddd"
sm["C1"].font = Font(bold=True)
# Le garde-fou. Formulé sans apostrophe : la chaîne traverse un littéral
# JavaScript puis une source Python avant d'arriver dans Excel.
sm["D1"] = '=IF(WEEKDAY(\$B\$1,2)=4,"OK — bien un jeudi","⚠ PAS un jeudi — normal si tu remplis un autre jour")'
sm["D1"].font = Font(bold=True)
sm["A2"] = "Elle se met à jour toute seule. Ne la modifie que si tu remplis en retard."
sm["A3"] = "Les dates ci-dessous se calculent toutes seules et alimentent la liste."
sm["A4"] = "La plus récente en premier : les jours de la semaine écoulée sont en haut."
c = sm.cell(row=6, column=1, value="jour"); c.fill = VERT; c.font = BLANC
c = sm.cell(row=6, column=2, value="date"); c.fill = VERT; c.font = BLANC
for i in range(JOURS_OFFERTS):
    formule = "=$B$1" if i == 0 else f"=$B$1-{i}"
    # Même valeur, deux formats : le nom du jour pour l'humain, la date pour la
    # liste. Un format, pas une formule : TEXT() change de langue avec Excel.
    jour = sm.cell(row=7 + i, column=1, value=formule)
    jour.number_format = "dddd"
    date = sm.cell(row=7 + i, column=2, value=formule)
    date.number_format = "DD/MM/YYYY"
sm.column_dimensions["A"].width = 16
sm.column_dimensions["B"].width = 16
derniere_date = 6 + JOURS_OFFERTS

# ---- Feuille « Passages » : celle qu'on remplit ----------------------------
ws = wb["Sheet"]
ws.title = "Passages"
wb.move_sheet("Passages", offset=-3)

ws["A1"] = "Une ligne par passage. Choisis dans les listes — rien à taper."
ws["A1"].font = Font(bold=True, size=12)
# La période couverte, rappelée ICI : personne n'ira la vérifier sur une autre
# feuille. Les bornes sont calculées, donc elles ne peuvent pas mentir.
# ⚠️ Le dollar est échappé : ce script Python vit dans un gabarit JavaScript.
ws["A2"] = "Dates proposées, de :"
ws["B2"] = f"=MIN(Periode!\$B\$7:\$B\${derniere_date})"
ws["B2"].number_format = "DD/MM/YYYY"
ws["C2"] = f"=MAX(Periode!\$B\$7:\$B\${derniere_date})"
ws["C2"].number_format = "DD/MM/YYYY"
ws["D2"] = "=Periode!\$D\$1"

COLONNES = [
    ("date_visite",   True,  22),
    ("magasin",       True,  48),
    ("commercial",    True,  22),
    ("heure_arrivee", False, 16),
    ("heure_depart",  False, 16),
]
for i, (nom, obligatoire, largeur) in enumerate(COLONNES, start=1):
    c = ws.cell(row=4, column=i, value=nom)
    c.fill = VERT if obligatoire else GRIS
    c.font = BLANC
    ws.column_dimensions[get_column_letter(i)].width = largeur
ws.freeze_panes = "A5"
debut, fin = 5, 4 + LIGNES_A_REMPLIR

# Les trois listes déroulantes.
v_date = DataValidation(
    type="list", formula1=f"=Periode!$B$7:$B\${derniere_date}", allow_blank=True
)
v_date.error = "Choisis une date dans la liste deroulante. Les dates proposees sont rappelees en haut de cette feuille."
v_date.errorTitle = "Date hors periode"
ws.add_data_validation(v_date)
v_date.add(f"A{debut}:A{fin}")

v_mag = DataValidation(
    type="list", formula1=f"=Magasins!$A$2:$A\${dernier_magasin}", allow_blank=True
)
v_mag.error = "Choisis un magasin dans la liste déroulante."
v_mag.errorTitle = "Magasin inconnu"
ws.add_data_validation(v_mag)
v_mag.add(f"B{debut}:B{fin}")

v_com = DataValidation(
    type="list", formula1=f"=Equipe!$A$2:$A\${dernier_commercial}", allow_blank=True
)
v_com.error = "Choisis un commercial dans la liste déroulante."
v_com.errorTitle = "Commercial inconnu"
ws.add_data_validation(v_com)
v_com.add(f"C{debut}:C{fin}")

for r in range(debut, fin + 1):
    ws.cell(row=r, column=1).number_format = "DD/MM/YYYY"
    ws.cell(row=r, column=4).number_format = "HH:MM"
    ws.cell(row=r, column=5).number_format = "HH:MM"
ws.auto_filter.ref = f"A4:E{fin}"

# ---- Feuille « Mode d'emploi » --------------------------------------------
md = wb.create_sheet("Mode d'emploi")
md["A1"] = "Comment remplir ce classeur"
md["A1"].font = Font(bold=True, size=14)
etapes = [
    "1. Il n'y a AUCUNE date à taper. La feuille « Periode » se cale toute seule sur le jour",
    "   où tu ouvres le classeur, et propose les 21 jours qui précèdent.",
    "   Trois semaines de recul : le cycle jeudi → jeudi est couvert, et il reste de la marge",
    "   pour corriger un passage d'une semaine déjà transmise.",
    "   La période proposée est rappelée en haut de la feuille « Passages ».",
    "   (Si tu remplis longtemps après coup, tu peux forcer la date de référence en B1",
    "   de la feuille « Periode » — le jour de la semaine s'affiche à côté pour te contrôler.)",
    "",
    "2. Feuille « Passages » : une ligne par passage effectué.",
    "   · date_visite  → choisis dans la liste (les 21 derniers jours)",
    "   · magasin      → choisis dans la liste (les 182 points de vente)",
    "   · commercial   → choisis dans la liste",
    "   · heures       → facultatives. Si tu les as, elles nous donnent la durée réelle des visites.",
    "",
    "3. N'inscris QUE les passages réellement effectués. Une visite prévue mais non faite",
    "   ne doit pas figurer : c'est ce qui a eu lieu qui nous intéresse.",
    "",
    "4. Enregistre normalement (Ctrl+S) et envoie-nous LE CLASSEUR, tel quel.",
    "   Pas de conversion, pas d'export CSV : notre application lit le .xlsx",
    "   et va chercher la feuille « Passages » toute seule.",
    "",
    "Le classeur se réutilise chaque semaine : il suffit de changer la date d'envoi",
    "et d'effacer les lignes précédentes.",
]
for i, ligne in enumerate(etapes, start=3):
    md.cell(row=i, column=1, value=ligne)
md.column_dimensions["A"].width = 100

wb.save(sys.argv[2])
print(len(d["magasins"]))
`;

fs.mkdirSync("docs", { recursive: true });
const n = execFileSync(
  "python3",
  ["-c", script, JSON.stringify({ magasins, commerciaux: COMMERCIAUX }), SORTIE],
  { encoding: "utf8" }
).trim();

console.log(`\n${SORTIE} écrit`);
console.log(`  « Passages »    : 3 listes déroulantes, 120 lignes prêtes`);
console.log(`  « Periode »     : 21 dates calculées depuis =AUJOURDHUI(), rien à taper`);
console.log(`  « Magasins »    : ${n} références`);
console.log(`  « Equipe »      : ${COMMERCIAUX.length} commerciaux`);
console.log(`  « Mode d'emploi »\n`);
