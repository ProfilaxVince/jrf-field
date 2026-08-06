"use client";
import { EtatBadge } from "./etat-badge";
import { detteAffichable } from "@/lib/domain/dette";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";
import type { StorePriorite } from "@/lib/data/dette";

/**
 * Une ligne de la liste « À voir en priorité ».
 * Pas de couleur de personne ici : aucun magasin n'appartient à quiconque,
 * n'importe quel commercial peut y passer (politique confirmée le 06/08/2026).
 * Aucun chiffre de score à l'écran : l'ordre porte l'information.
 */
export function StorePrioriteRow({
  item,
  action,
}: {
  item: StorePriorite;
  action?: React.ReactNode;
}) {
  const { store, dette } = item;
  const affichage = detteAffichable(dette, t.visite);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-card px-4 py-3 first:rounded-t-lg last:rounded-b-lg">
      <div className="min-w-0 flex-[1_1_60%]">
        <p className="truncate text-lg font-semibold">{store.name}</p>
        <p className="truncate text-sm text-neutral-500">
          {store.city} — {t.stores.enseigneLabels[store.enseigne] ?? store.enseigne}
          {dette.last_visit_at
            ? ` · ${t.priorities.lastVisit(formatDate(dette.last_visit_at))}`
            : ""}
        </p>
      </div>
      <EtatBadge etat={affichage.etat} libelle={affichage.libelle} />
      {action}
    </li>
  );
}
