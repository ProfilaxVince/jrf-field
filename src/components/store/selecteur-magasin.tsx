"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { REGIONS, type StoreRow } from "@/lib/data/stores";
import { t } from "@/lib/i18n/fr-BE";

const RESULTATS_MAX = 15;

/**
 * Recherche de magasin, partagée par le portail responsable et le terrain.
 * Le filtre par région est en premier : sur 185 magasins, c'est le tri que
 * l'utilisateur fait dans sa tête avant même de chercher un nom.
 */
export function SelecteurMagasin({
  magasins,
  exclus,
  libelleExclu,
  actions,
  placeholder = t.field.searchStore,
}: {
  magasins: StoreRow[];
  exclus?: Set<string>;
  libelleExclu?: string;
  actions: (magasin: StoreRow) => React.ReactNode;
  placeholder?: string;
}) {
  const [recherche, setRecherche] = useState("");
  const [region, setRegion] = useState<string>("");

  const resultats = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return magasins
      .filter((m) => (region ? m.region === region : true))
      .filter((m) =>
        terme
          ? `${m.name} ${m.city} ${m.postal_code ?? ""}`.toLowerCase().includes(terme)
          : true
      )
      .slice(0, RESULTATS_MAX);
  }, [magasins, recherche, region]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={region === "" ? "default" : "outline"}
          aria-pressed={region === ""}
          onClick={() => setRegion("")}
        >
          {t.field.allRegions}
        </Button>
        {REGIONS.map((r) => (
          <Button
            key={r}
            variant={region === r ? "default" : "outline"}
            aria-pressed={region === r}
            onClick={() => setRegion(r)}
          >
            {t.stores.regionLabels[r] ?? r}
          </Button>
        ))}
      </div>

      <input
        className="min-h-[44px] w-full rounded border border-border px-3 text-base"
        placeholder={placeholder}
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      {resultats.length === 0 ? (
        <p className="text-base text-neutral-500">{t.field.noStore}</p>
      ) : (
        <ul className="divide-y divide-border">
          {resultats.map((magasin) => (
            <li key={magasin.id} className="flex flex-wrap items-center gap-2 py-2">
              <div className="min-w-0 flex-[1_1_100%] sm:flex-1">
                <p className="break-words text-base font-medium">{magasin.name}</p>
                <p className="break-words text-sm text-neutral-500">
                  {magasin.postal_code ? `${magasin.postal_code} ` : ""}
                  {magasin.city}
                  {magasin.address ? ` · ${magasin.address}` : ""}
                </p>
              </div>
              {exclus?.has(magasin.id) ? (
                <span className="text-sm text-neutral-500">{libelleExclu}</span>
              ) : (
                actions(magasin)
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
