"use client";
/**
 * Exports CSV. Les données viennent des mêmes lectures que les écrans :
 * un export ne doit jamais raconter autre chose que ce que l'utilisateur voit.
 */
import { listStorePriorites } from "./dette";
import { listRelaisCentrale } from "./incidents";
import { listVisitsPeriode } from "./planning";
import { listStores } from "./stores";
import { listAppUsers } from "./users";
import { telechargerCsv, versCsv } from "../csv";
import { detteAffichable } from "../domain/dette";
import { addDays, aujourdhuiISO, formatDate, jourISO } from "../dates";
import { t } from "../i18n/fr-BE";
import type { CompteRendu } from "../domain/compte-rendu";

export async function exporterMagasins(): Promise<void> {
  const items = await listStorePriorites();
  const contenu = versCsv(items, [
    { entete: "Magasin", valeur: (i) => i.store.name },
    { entete: "Ville", valeur: (i) => i.store.city },
    {
      entete: "Enseigne",
      valeur: (i) => t.stores.enseigneLabels[i.store.enseigne] ?? i.store.enseigne,
    },
    { entete: "Categorie", valeur: (i) => i.dette.tier },
    { entete: "CA JRF (EUR)", valeur: (i) => i.store.jrf_revenue_eur },
    { entete: "Exercice", valeur: (i) => i.store.jrf_revenue_year },
    { entete: "Frequence prevue (jours)", valeur: (i) => i.dette.frequence_cible_jours },
    {
      entete: "Derniere visite",
      valeur: (i) => (i.dette.last_visit_at ? formatDate(i.dette.last_visit_at) : ""),
    },
    { entete: "Jours depuis", valeur: (i) => i.dette.jours_depuis_derniere_visite },
    { entete: "Etat", valeur: (i) => detteAffichable(i.dette, t.visite).libelle },
  ]);
  telechargerCsv(`magasins-${aujourdhuiISO()}.csv`, contenu);
}

export async function exporterVisites(jours = 90): Promise<void> {
  const debut = jourISO(addDays(new Date(), -jours));
  const [visites, magasins, users] = await Promise.all([
    listVisitsPeriode(debut, aujourdhuiISO()),
    listStores(),
    listAppUsers(),
  ]);
  const nomMagasin = new Map(magasins.map((m) => [m.id, m.name]));
  const surnom = new Map(users.map((u) => [u.id, u.nickname]));

  const contenu = versCsv(visites, [
    { entete: "Date", valeur: (v) => formatDate(v.scheduled_date) },
    { entete: "Magasin", valeur: (v) => nomMagasin.get(v.store_id) ?? "" },
    { entete: "Commercial", valeur: (v) => surnom.get(v.user_id) ?? "" },
    { entete: "Type", valeur: (v) => v.visit_type },
    { entete: "Statut", valeur: (v) => v.status },
    { entete: "Rayon en ordre", valeur: (v) => (v.rayon_conforme === null ? "" : v.rayon_conforme ? "oui" : "non") },
    { entete: "Remarque", valeur: (v) => v.notes },
    { entete: "A remonter", valeur: (v) => (v.relais_centrale ? "oui" : "non") },
  ]);
  telechargerCsv(`visites-${aujourdhuiISO()}.csv`, contenu);
}

export async function exporterRelais(jours = 90): Promise<void> {
  const debut = jourISO(addDays(new Date(), -jours));
  const [visites, magasins, users] = await Promise.all([
    listRelaisCentrale(debut),
    listStores(),
    listAppUsers(),
  ]);
  const nomMagasin = new Map(magasins.map((m) => [m.id, m.name]));
  const surnom = new Map(users.map((u) => [u.id, u.nickname]));

  const contenu = versCsv(visites, [
    { entete: "Date", valeur: (v) => formatDate(v.scheduled_date) },
    { entete: "Magasin", valeur: (v) => nomMagasin.get(v.store_id) ?? "" },
    { entete: "Remonte par", valeur: (v) => surnom.get(v.user_id) ?? "" },
    { entete: "Message", valeur: (v) => ((v.report ?? {}) as CompteRendu).message_centrale ?? "" },
    { entete: "Ruptures", valeur: (v) => ((v.report ?? {}) as CompteRendu).ruptures ?? "" },
  ]);
  telechargerCsv(`remontees-centrale-${aujourdhuiISO()}.csv`, contenu);
}
