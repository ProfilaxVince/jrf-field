"use client";
import { useMemo } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ENSEIGNES, REGIONS, type StoreRow } from "@/lib/data/stores";
import { t } from "@/lib/i18n/fr-BE";

/**
 * Le parc entier, groupé par enseigne puis par région — la façon dont
 * l'utilisateur pense son terrain. 185 lignes à plat ne se lisent pas.
 *
 * Le compte est affiché à chaque niveau : c'est le seul moyen de vérifier d'un
 * coup d'œil que l'import correspond au fichier source (95 Intermarché,
 * 78 AD Delhaize…), sans exporter ni compter à la main.
 */
export function ListeGroupee({
  magasins,
  onModifier,
  onRetirer,
}: {
  magasins: StoreRow[];
  onModifier: (store: StoreRow) => void;
  onRetirer: (store: StoreRow) => void;
}) {
  const groupes = useMemo(() => {
    const index = new Map<string, Map<string, StoreRow[]>>();
    for (const magasin of magasins) {
      const parRegion = index.get(magasin.enseigne) ?? new Map<string, StoreRow[]>();
      const liste = parRegion.get(magasin.region) ?? [];
      liste.push(magasin);
      parRegion.set(magasin.region, liste);
      index.set(magasin.enseigne, parRegion);
    }
    // Ordre imposé (Intermarché d'abord, Wallonie d'abord) plutôt qu'alphabétique :
    // il reflète le poids réel du parc.
    return ENSEIGNES.filter((e) => index.has(e)).map((enseigne) => {
      const parRegion = index.get(enseigne) as Map<string, StoreRow[]>;
      return {
        enseigne,
        total: [...parRegion.values()].reduce((n, l) => n + l.length, 0),
        regions: REGIONS.filter((r) => parRegion.has(r)).map((region) => ({
          region,
          magasins: (parRegion.get(region) as StoreRow[]).sort(
            (a, b) => a.city.localeCompare(b.city, "fr") || a.name.localeCompare(b.name, "fr")
          ),
        })),
      };
    });
  }, [magasins]);

  return (
    <div className="space-y-8">
      {groupes.map(({ enseigne, total, regions }) => (
        <section key={enseigne} className="space-y-4">
          <h2 className="flex items-baseline gap-3 border-b-2 border-jrf-800/20 pb-1">
            <span className="font-display text-xl font-bold uppercase tracking-[0.1em] text-jrf-800">
              {t.stores.enseigneLabels[enseigne] ?? enseigne}
            </span>
            <span className="text-base text-neutral-500">{t.priorities.count(total)}</span>
          </h2>

          {regions.map(({ region, magasins: liste }) => (
            <div key={region} className="space-y-2">
              <h3 className="flex items-baseline gap-2 text-base font-semibold text-neutral-700">
                {t.stores.regionLabels[region] ?? region}
                <span className="text-sm font-normal text-neutral-500">
                  {t.priorities.count(liste.length)}
                </span>
              </h3>

              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {liste.map((magasin) => (
                  <li
                    key={magasin.id}
                    className="flex flex-wrap items-center justify-between gap-3 bg-card px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold">{magasin.name}</p>
                      <p className="text-sm text-neutral-600">
                        {magasin.postal_code ? `${magasin.postal_code} ` : ""}
                        {magasin.city}
                      </p>
                      {/* Adresse et référence : deux homonymes dans la même ville
                          ne se distinguent que par là. */}
                      {(magasin.address || magasin.external_ref) && (
                        <p className="text-sm text-neutral-500">
                          {magasin.address ?? ""}
                          {magasin.address && magasin.external_ref ? " · " : ""}
                          {magasin.external_ref ?? ""}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {/* Le patron est devant l'adhérent : le rapport doit être
                          à un clic de la recherche, pas dans un sous-menu. */}
                      <Button variant="outline" asChild>
                        <Link href={`/stores/${magasin.id}/rapport`}>
                          <FileText aria-hidden />
                          {t.stores.reportOpen}
                        </Link>
                      </Button>
                      <Button variant="outline" onClick={() => onModifier(magasin)}>
                        {t.stores.edit}
                      </Button>
                      <Button variant="destructive" onClick={() => onRetirer(magasin)}>
                        {t.stores.remove}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
