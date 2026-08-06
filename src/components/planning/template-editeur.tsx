"use client";
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";
import type { StoreRow } from "@/lib/data/stores";
import type { TemplateStopRow } from "@/lib/data/templates";

const RESULTATS_MAX = 10;

/** Composition d'un modèle : la liste ordonnée des magasins qu'il contient. */
export function TemplateEditeur({
  stops,
  magasins,
  onAjouter,
  onRetirer,
  onDeplacer,
}: {
  stops: TemplateStopRow[];
  magasins: Map<string, StoreRow>;
  onAjouter: (storeId: string) => void;
  onRetirer: (storeId: string) => void;
  onDeplacer: (storeId: string, sens: -1 | 1) => void;
}) {
  const [recherche, setRecherche] = useState("");
  const dansLeModele = useMemo(() => new Set(stops.map((s) => s.store_id)), [stops]);

  const resultats = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [];
    return [...magasins.values()]
      .filter((m) =>
        `${m.name} ${m.city} ${m.postal_code ?? ""}`.toLowerCase().includes(terme)
      )
      .slice(0, RESULTATS_MAX);
  }, [magasins, recherche]);

  return (
    <div className="space-y-4">
      {stops.length === 0 ? (
        <p className="text-base text-neutral-500">{t.templates.noStops}</p>
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {stops.map((stop, index) => {
            const magasin = magasins.get(stop.store_id);
            return (
              <li key={stop.store_id} className="flex items-center gap-2 bg-card px-3 py-2">
                <span className="w-6 shrink-0 text-base tabular-nums text-neutral-500">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{magasin?.name ?? "—"}</p>
                  <p className="truncate text-sm text-neutral-500">
                    {magasin?.postal_code ? `${magasin.postal_code} ` : ""}
                    {magasin?.city ?? ""}
                    {magasin?.address ? ` · ${magasin.address}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t.templates.moveUp}
                  onClick={() => onDeplacer(stop.store_id, -1)}
                  className="flex size-11 items-center justify-center rounded-md text-neutral-700 hover:bg-secondary"
                >
                  <ChevronUp aria-hidden className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={t.templates.moveDown}
                  onClick={() => onDeplacer(stop.store_id, 1)}
                  className="flex size-11 items-center justify-center rounded-md text-neutral-700 hover:bg-secondary"
                >
                  <ChevronDown aria-hidden className="size-5" />
                </button>
                <button
                  type="button"
                  aria-label={t.templates.removeStop}
                  onClick={() => onRetirer(stop.store_id)}
                  className="flex size-11 items-center justify-center rounded-md text-neutral-700 hover:bg-secondary"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      <div className="space-y-2">
        <label className="block text-base font-medium">{t.templates.addStore}</label>
        <input
          className="min-h-[44px] w-full rounded border border-border px-3 text-base"
          placeholder={t.templates.searchStore}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <ul className="divide-y divide-border">
          {resultats.map((magasin) => (
            <li key={magasin.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-base">{magasin.name}</p>
                <p className="truncate text-sm text-neutral-500">
                  {magasin.postal_code ? `${magasin.postal_code} ` : ""}
                  {magasin.city}
                  {magasin.address ? ` · ${magasin.address}` : ""}
                </p>
              </div>
              {dansLeModele.has(magasin.id) ? (
                <span className="text-sm text-neutral-500">{t.templates.alreadyIn}</span>
              ) : (
                <Button variant="outline" onClick={() => onAjouter(magasin.id)}>
                  {t.planning.add}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
