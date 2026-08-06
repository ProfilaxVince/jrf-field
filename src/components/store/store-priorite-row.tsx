"use client";
import { EtatBadge } from "./etat-badge";
import { detteAffichable } from "@/lib/domain/dette";
import { formatDate } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";
import type { StorePriorite } from "@/lib/data/dette";

/**
 * Une ligne de la liste « À voir en priorité ».
 * Liseré gauche = couleur de la personne qui couvre le magasin (jamais un état).
 * Aucun chiffre de score à l'écran : l'ordre porte l'information.
 */
export function StorePrioriteRow({
  item,
  couleurPersonne,
  action,
}: {
  item: StorePriorite;
  couleurPersonne?: string | null;
  action?: React.ReactNode;
}) {
  const { store, dette } = item;
  const affichage = detteAffichable(dette, t.visite);

  return (
    <li
      className="flex items-center gap-4 border-l-4 border-border bg-card px-4 py-3 first:rounded-t-lg last:rounded-b-lg"
      style={couleurPersonne ? { borderLeftColor: couleurPersonne } : undefined}
    >
      <div className="min-w-0 flex-1">
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
