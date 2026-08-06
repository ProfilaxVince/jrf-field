"use client";
import { ChevronDown, ChevronUp, Sunrise, X } from "lucide-react";
import { EtatBadge } from "@/components/store/etat-badge";
import { detteAffichable } from "@/lib/domain/dette";
import { t } from "@/lib/i18n/fr-BE";
import type { StorePriorite } from "@/lib/data/dette";
import type { VisitRow } from "@/lib/data/planning";

/**
 * Un arrêt de la tournée. Le montage de rayon (6 h) n'est pas réordonnable :
 * il ouvre la journée par construction et ne remet pas la dette à zéro,
 * donc il n'affiche pas d'état de retard.
 */
export function ArretRow({
  visit,
  priorite,
  onMonter,
  onDescendre,
  onRetirer,
}: {
  visit: VisitRow;
  priorite?: StorePriorite;
  onMonter: () => void;
  onDescendre: () => void;
  onRetirer: () => void;
}) {
  const montage = visit.visit_type === "montage_rayon";
  const affichage = priorite ? detteAffichable(priorite.dette, t.visite) : null;

  return (
    <li className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="break-words text-base font-medium">
          {montage && <Sunrise aria-hidden className="mr-1 inline size-4 align-[-2px]" />}
          {priorite?.store.name ?? "—"}
        </p>
        {montage ? (
          <p className="text-sm text-neutral-500">{t.planning.montage}</p>
        ) : (
          affichage && <EtatBadge etat={affichage.etat} libelle={affichage.libelle} />
        )}
      </div>
      {!montage && (
        <>
          <button
            type="button"
            aria-label={t.planning.moveUp}
            onClick={onMonter}
            className="flex size-11 items-center justify-center rounded-md text-neutral-700 hover:bg-secondary"
          >
            <ChevronUp aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            aria-label={t.planning.moveDown}
            onClick={onDescendre}
            className="flex size-11 items-center justify-center rounded-md text-neutral-700 hover:bg-secondary"
          >
            <ChevronDown aria-hidden className="size-5" />
          </button>
        </>
      )}
      <button
        type="button"
        aria-label={t.planning.remove}
        onClick={onRetirer}
        className="flex size-11 items-center justify-center rounded-md text-neutral-700 hover:bg-secondary"
      >
        <X aria-hidden className="size-5" />
      </button>
    </li>
  );
}
