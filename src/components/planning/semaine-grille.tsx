"use client";
import { ArretRow } from "./arret-row";
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
}: {
  users: AppUserRow[];
  jours: string[];
  visitesParCellule: Map<string, VisitRow[]>;
  indisponibilites: Set<string>;
  prioritesParStore: Map<string, StorePriorite>;
  onMonter: (visit: VisitRow) => void;
  onDescendre: (visit: VisitRow) => void;
  onRetirer: (visit: VisitRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-[9rem_repeat(5,1fr)] gap-2">
          <div />
          {jours.map((jour) => (
            <div key={jour} className="px-1 pb-1 text-base font-semibold capitalize text-neutral-700">
              {formatJourCourt(jour)}
            </div>
          ))}

          {users.map((user) => (
            <div key={user.id} className="contents">
              <div className="flex items-center gap-2 border-l-4 py-2 pl-2" style={{ borderLeftColor: user.color_hex }}>
                <span
                  aria-hidden
                  className="inline-block size-4 shrink-0 rounded-full border border-border"
                  style={{ backgroundColor: user.color_hex }}
                />
                <span className="truncate text-base font-semibold">{user.nickname}</span>
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
                    ) : visites.length === 0 ? (
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
