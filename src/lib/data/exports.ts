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
import type { ArretFeuille, FeuilleCommercial } from "../domain/feuille-semaine";

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

/**
 * La même feuille de semaine que celle qu'on imprime, mais en tableur.
 * Un seul fichier, colonne « Commercial » en tête : Excel filtre dessus en
 * deux clics, alors qu'un fichier par personne déclencherait cinq
 * téléchargements — que le navigateur finit par bloquer.
 *
 * Les jours vides sont conservés, comme sur le papier : une ligne « rien de
 * prévu » se lit, un trou dans le tableau se discute.
 */
export function exporterFeuillesTableur(feuilles: FeuilleCommercial[], suffixe: string): void {
  type Ligne = {
    commercial: string;
    semaine: number;
    jour: string;
    date: string;
    arret: ArretFeuille | null;
  };

  const lignes: Ligne[] = [];
  for (const f of feuilles) {
    for (const semaine of f.semaines) {
      for (const jour of semaine.jours) {
        if (jour.arrets.length === 0) {
          lignes.push({
            commercial: f.surnom,
            semaine: semaine.numero,
            jour: jour.libelle,
            date: jour.date,
            arret: null,
          });
          continue;
        }
        for (const arret of jour.arrets) {
          lignes.push({
            commercial: f.surnom,
            semaine: semaine.numero,
            jour: jour.libelle,
            date: jour.date,
            arret,
          });
        }
      }
    }
  }

  const contenu = versCsv(lignes, [
    { entete: "Commercial", valeur: (l) => l.commercial },
    { entete: "Semaine", valeur: (l) => l.semaine },
    { entete: "Jour", valeur: (l) => l.jour },
    { entete: "Date", valeur: (l) => formatDate(l.date) },
    { entete: "Ordre", valeur: (l) => l.arret?.ordre ?? "" },
    { entete: "Magasin", valeur: (l) => l.arret?.magasin ?? "" },
    { entete: "Type", valeur: (l) => l.arret?.type ?? "" },
    { entete: "Raison du depannage", valeur: (l) => l.arret?.motif ?? "" },
    { entete: "Adresse", valeur: (l) => l.arret?.adresse ?? "" },
    { entete: "Code postal", valeur: (l) => l.arret?.codePostal ?? "" },
    { entete: "Ville", valeur: (l) => l.arret?.ville ?? "" },
    { entete: "Adherent", valeur: (l) => l.arret?.adherent ?? "" },
    { entete: "Telephone adherent", valeur: (l) => l.arret?.adherentTel ?? "" },
    { entete: "Responsable F&L", valeur: (l) => l.arret?.responsableFl ?? "" },
    { entete: "Telephone responsable F&L", valeur: (l) => l.arret?.responsableFlTel ?? "" },
  ]);
  telechargerCsv(`plannings-${suffixe}.csv`, contenu);
}
