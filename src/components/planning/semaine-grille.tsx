"use client";
import { Eraser, Plus, Route } from "lucide-react";
import { ArretRow } from "./arret-row";
import { Button } from "@/components/ui/button";
import { cellKey } from "@/hooks/use-planning-semaine";
import { formatJourCourt } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";
import type { StorePriorite } from "@/lib/data/dette";
import type { VisitRow } from "@/lib/data/planning";
import type { AppUserRow } from "@/lib/data/users";

/**
 * Une ligne par personne, une colonne par jour ouvré — la lecture de l'Excel
 * remplacé. La couleur de personne ne sert qu'à la pastille et au liseré :
 * jamais de fond de cellule coloré (règle de non-collision).
 */
export function SemaineGrille({
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
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px]">
        {/* Le nombre de colonnes suit `jours` : 5 en semaine, 7 quand le
            week-end est affiché. Un `repeat(5)` en dur écrasait le samedi et
            le dimanche l'un sur l'autre. */}
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `9rem repeat(${jours.length}, minmax(0, 1fr))` }}
        >
          <div />
          {jours.map((jour) => (
            <div key={jour} className="px-1 pb-1 text-base font-semibold capitalize text-neutral-700">
              {formatJourCourt(jour)}
            </div>
          ))}

          {users.map((user) => (
            <div key={user.id} className="contents">
              <div
                className="flex items-center gap-2 border-l-4 py-2 pl-2"
                style={{ borderLeftColor: user.color_hex }}
              >
                <span
                  aria-hidden
                  className="inline-block size-4 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: user.color_hex }}
                />
                <span className="min-w-0 flex-1 truncate text-base font-semibold">
                  {user.nickname}
                </span>
                {/* Vidage par personne : on refait rarement la semaine de toute
                    l'équipe, presque toujours celle de quelqu'un en particulier. */}
                <button
                  type="button"
                  aria-label={t.planning.clearWeekFor(user.nickname)}
                  title={t.planning.clearWeekFor(user.nickname)}
                  onClick={() => onVider(user.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-md text-neutral-700 hover:bg-secondary"
                >
                  <Eraser aria-hidden className="size-5" />
                </button>
              </div>

              {jours.map((jour) => {
                const key = cellKey(user.id, jour);
                const visites = visitesParCellule.get(key) ?? [];
                const indisponible = indisponibilites.has(key);
                return (
                  <div
                    key={key}
                    className="min-h-24 rounded-lg border border-border bg-secondary/40 p-1"
                  >
                    {indisponible ? (
                      <p className="px-1 py-2 text-sm text-neutral-500">{t.planning.absent}</p>
                    ) : (
                      <>
                        {visites.length === 0 ? (
                          <p className="px-1 py-2 text-sm text-neutral-500">{t.planning.emptyDay}</p>
                        ) : (
                          <ul className="space-y-1">
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
                        <div className="flex gap-1 pt-1">
                          <Button
                            variant="ghost"
                            className="min-h-[44px] flex-1 justify-start px-2 text-base"
                            onClick={() => onAjouter(user.id, jour)}
                          >
                            <Plus aria-hidden />
                            {t.planning.add}
                          </Button>
                          {visites.filter((v) => v.visit_type !== "montage_rayon").length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={t.planning.reorderByRoute}
                              title={t.planning.reorderByRoute}
                              onClick={() => onRanger(user.id, jour)}
                            >
                              <Route aria-hidden />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
