"use client";
import { useState } from "react";
import { Eraser, Plus, Route } from "lucide-react";
import { ArretRow } from "./arret-row";
import { Button } from "@/components/ui/button";
import { cellKey } from "@/hooks/use-planning-semaine";
import { formatJourCourt, formatJourLong } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";
import type { StorePriorite } from "@/lib/data/dette";
import type { VisitRow } from "@/lib/data/planning";
import type { AppUserRow } from "@/lib/data/users";

/**
 * Vue semaine du TÉLÉPHONE : un jour à la fois, une carte par commercial.
 *
 * La grille 6 personnes × 5 jours fait 860 px de large. Sur un écran de
 * 360 px, elle impose un défilement latéral — le geste le moins fiable au
 * pouce, et celui qui fait perdre la colonne qu'on regardait. Un seul jour
 * tient en pleine largeur, et les cinq jours se choisissent d'un doigt.
 *
 * Mêmes actions que sur grand écran : ajouter, monter, descendre, retirer,
 * ranger par trajet, vider. Aucune fonction n'est réservée à l'ordinateur.
 */
export function SemaineJour({
  users,
  jours,
  visitesParCellule,
  indisponibilites,
  prioritesParStore,
  onMonter,
  onDescendre,
  onRetirer,
  onAjouter,
  onRanger,
  onVider,
}: {
  users: AppUserRow[];
  jours: string[];
  visitesParCellule: Map<string, VisitRow[]>;
  indisponibilites: Set<string>;
  prioritesParStore: Map<string, StorePriorite>;
  onMonter: (visit: VisitRow) => void;
  onDescendre: (visit: VisitRow) => void;
  onRetirer: (visit: VisitRow) => void;
  onAjouter: (userId: string, date: string) => void;
  onRanger: (userId: string, date: string) => void;
  onVider: (userId: string) => void;
}) {
  const [jour, setJour] = useState(jours[0] ?? "");
  const jourActif = jours.includes(jour) ? jour : (jours[0] ?? "");

  return (
    <div className="space-y-4">
      {/* `auto-fit` + `minmax` : les onglets se replient sur deux lignes quand
          sept ne tiennent pas dans la largeur. Un `repeat(7, 1fr)` poussait la
          page en défilement latéral — le geste le moins fiable au pouce, et
          celui qui fait perdre la colonne qu'on regardait. */}
      <div
        role="group"
        aria-label={t.planning.dayPicker}
        className="grid gap-1 [grid-template-columns:repeat(auto-fit,minmax(3.25rem,1fr))]"
      >
        {jours.map((j) => {
          const arrets = users.reduce(
            (n, u) => n + (visitesParCellule.get(cellKey(u.id, j))?.length ?? 0),
            0
          );
          const actif = j === jourActif;
          return (
            <button
              key={j}
              type="button"
              aria-pressed={actif}
              onClick={() => setJour(j)}
              className={`flex min-h-[56px] flex-col items-center justify-center rounded-md border px-1 py-1 text-sm capitalize ${
                actif
                  ? "border-jrf-800 bg-secondary font-semibold text-jrf-800"
                  : "border-border bg-card text-neutral-700"
              }`}
            >
              <span>{formatJourCourt(j)}</span>
              {/* Le nombre d'arrêts sur l'onglet évite d'ouvrir les cinq
                  jours pour trouver celui qui est vide. */}
              <span className="text-xs text-neutral-500">{arrets}</span>
            </button>
          );
        })}
      </div>

      <p className="text-base font-semibold capitalize text-neutral-700">
        {jourActif ? formatJourLong(jourActif) : ""}
      </p>

      <div className="space-y-3">
        {users.map((user) => {
          const key = cellKey(user.id, jourActif);
          const visites = visitesParCellule.get(key) ?? [];
          const indisponible = indisponibilites.has(key);
          return (
            <section
              key={user.id}
              className="rounded-lg border border-l-4 border-border bg-card p-3"
              style={{ borderLeftColor: user.color_hex }}
            >
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-4 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: user.color_hex }}
                />
                <span className="min-w-0 flex-1 break-words text-base font-semibold">
                  {user.nickname}
                </span>
                <button
                  type="button"
                  aria-label={t.planning.clearWeekFor(user.nickname)}
                  onClick={() => onVider(user.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-neutral-700 hover:bg-secondary"
                >
                  <Eraser aria-hidden className="size-5" />
                </button>
              </div>

              {indisponible ? (
                <p className="py-2 text-base text-neutral-500">{t.planning.absent}</p>
              ) : (
                <>
                  {visites.length === 0 ? (
                    <p className="py-2 text-base text-neutral-500">{t.planning.emptyDay}</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {visites.map((visit) => (
                        <ArretRow
                          key={visit.id}
                          visit={visit}
                          priorite={prioritesParStore.get(visit.store_id)}
                          onMonter={() => onMonter(visit)}
                          onDescendre={() => onDescendre(visit)}
                          onRetirer={() => onRetirer(visit)}
                        />
                      ))}
                    </ul>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 justify-start"
                      onClick={() => onAjouter(user.id, jourActif)}
                    >
                      <Plus aria-hidden />
                      {t.planning.add}
                    </Button>
                    {visites.filter((v) => v.visit_type !== "montage_rayon").length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t.planning.reorderByRoute}
                        onClick={() => onRanger(user.id, jourActif)}
                      >
                        <Route aria-hidden />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
