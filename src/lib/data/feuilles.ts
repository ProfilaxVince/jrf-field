"use client";
/**
 * Lecture unique qui alimente les DEUX sorties de la feuille de semaine :
 * l'impression (PDF) et le tableur. Les exports ne racontent jamais autre
 * chose que l'écran — ils lisent les mêmes tables, juste sur la plage que
 * Gérardo demande.
 *
 * Cette lecture ne dépend PAS de l'état de l'écran Semaine, qui ne charge
 * qu'une semaine à la fois. Sur deux semaines, s'appuyer dessus donnerait une
 * feuille amputée de la seconde sans le dire.
 */
import { listAbsences, listHolidays, listVisitsPeriode } from "./planning";
import { listStores } from "./stores";
import { listAppUsers } from "./users";
import { construireFeuilles, semainesOuvrees, type FeuilleCommercial } from "../domain/feuille-semaine";
import { estWeekEnd } from "../dates";
import { t } from "../i18n/fr-BE";

const LIBELLE_TYPE: Record<string, string> = {
  conseil: t.planning.typeVisite,
  montage_rayon: t.planning.typeMontage,
  demo: t.planning.typeDemo,
  depannage: t.planning.typeDepannage,
  urgence: t.planning.typeUrgence,
  rattrapage: t.planning.typeRattrapage,
};

export async function chargerFeuilles(
  reference: Date,
  nombreDeSemaines: number
): Promise<FeuilleCommercial[]> {
  // On lit TOUJOURS la semaine entière, puis on ne garde le samedi et le
  // dimanche que s'ils portent quelque chose : une feuille où deux colonnes
  // vides apparaissent chaque semaine se lit moins bien, mais un dépannage
  // absent de la feuille de route est un déplacement que personne n'a noté.
  const completes = semainesOuvrees(reference, nombreDeSemaines, true);
  const jours = completes.flat();
  const debut = jours[0];
  const fin = jours[jours.length - 1];

  const [users, visites, magasins, absences, feries] = await Promise.all([
    listAppUsers(),
    listVisitsPeriode(debut, fin),
    listStores(),
    listAbsences(debut, fin),
    listHolidays(debut, fin),
  ]);

  const parId = new Map(magasins.map((m) => [m.id, m]));
  const joursFeries = new Set(feries.map((f) => f.jour));

  const entrees = visites.map((v) => ({
    userId: v.user_id,
    date: v.scheduled_date,
    position: v.position_in_day ?? 0,
    type: LIBELLE_TYPE[v.visit_type] ?? v.visit_type,
    motif: v.motif_depannage ?? "",
    magasin: parId.get(v.store_id) ?? null,
  }));

  const weekEndOccupe = visites.some((v) => estWeekEnd(v.scheduled_date));
  const grilles = weekEndOccupe ? completes : completes.map((s) => s.slice(0, 5));

  return construireFeuilles(
    users
      .filter((u) => u.porte_visites)
      .map((u) => ({
        id: u.id,
        nickname: u.nickname,
        nomComplet: [u.first_name, u.last_name].filter(Boolean).join(" "),
        couleur: u.color_hex,
      })),
    entrees,
    grilles,
    (userId, date) =>
      joursFeries.has(date) ||
      absences.some((a) => a.user_id === userId && a.date_debut <= date && a.date_fin >= date)
  );
}
