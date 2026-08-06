"use client";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EtatBadge } from "@/components/store/etat-badge";
import { REGIONS } from "@/lib/data/stores";
import { detteAffichable } from "@/lib/domain/dette";
import { t } from "@/lib/i18n/fr-BE";
import type { StorePriorite } from "@/lib/data/dette";
import type { TemplateRow } from "@/lib/data/templates";

const RESULTATS_MAX = 12;

/**
 * Panneau d'ajout d'un arrêt à une journée. En clair : c'est l'Admin qui
 * choisit, magasin par magasin ou modèle par modèle. Aucun remplissage
 * automatique (décision utilisateur du 06/08/2026).
 *
 * Les magasins restent triés par priorité : le choix est manuel, mais
 * l'ordre proposé reste celui de ce qui attend le plus.
 */
export function AjoutArret({
  titre,
  priorites,
  dejaPlanifies,
  templates,
  nbArretsParTemplate,
  onAjouter,
  onAppliquerTemplate,
  onFermer,
}: {
  titre: string;
  priorites: StorePriorite[];
  dejaPlanifies: Set<string>;
  templates: TemplateRow[];
  nbArretsParTemplate: Map<string, number>;
  onAjouter: (storeId: string, montage: boolean) => void;
  onAppliquerTemplate: (templateId: string) => void;
  onFermer: () => void;
}) {
  const [recherche, setRecherche] = useState("");
  const [region, setRegion] = useState("");

  // Le filtre par région d'abord : composer une journée, c'est choisir un coin
  // du pays avant de choisir des magasins. L'ordre de priorité est conservé
  // à l'intérieur du filtre.
  const resultats = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    return priorites
      .filter((p) => (region ? p.store.region === region : true))
      .filter((p) =>
        terme
          ? `${p.store.name} ${p.store.city} ${p.store.postal_code ?? ""}`
              .toLowerCase()
              .includes(terme)
          : true
      )
      .slice(0, RESULTATS_MAX);
  }, [priorites, recherche, region]);

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{titre}</h2>
        <Button variant="ghost" size="icon" aria-label={t.planning.close} onClick={onFermer}>
          <X aria-hidden />
        </Button>
      </div>

      {templates.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-base font-medium text-neutral-700">{t.planning.addTemplate}</h3>
          <div className="flex flex-wrap gap-2">
            {templates.map((modele) => (
              <Button
                key={modele.id}
                variant="outline"
                onClick={() => onAppliquerTemplate(modele.id)}
              >
                {modele.name} · {t.planning.templateStops(nbArretsParTemplate.get(modele.id) ?? 0)}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-base font-medium text-neutral-700">{t.planning.addStore}</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={region === "" ? "default" : "outline"}
            aria-pressed={region === ""}
            onClick={() => setRegion("")}
          >
            {t.planning.allRegions}
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
          placeholder={t.planning.searchStore}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <ul className="divide-y divide-border">
          {resultats.map((item) => {
            const deja = dejaPlanifies.has(item.store.id);
            const affichage = detteAffichable(item.dette, t.visite);
            return (
              <li key={item.store.id} className="flex flex-wrap items-center gap-2 py-2">
                <div className="min-w-0 flex-[1_1_100%] sm:flex-1">
                  <p className="truncate text-base font-medium">{item.store.name}</p>
                  <p className="truncate text-sm text-neutral-500">
                    {item.store.postal_code ? `${item.store.postal_code} ` : ""}
                    {item.store.city}
                    {item.store.address ? ` · ${item.store.address}` : ""}
                  </p>
                </div>
                <EtatBadge etat={affichage.etat} libelle={affichage.libelle} />
                {deja ? (
                  <span className="text-sm text-neutral-500">{t.planning.alreadyPlanned}</span>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => onAjouter(item.store.id, false)}>
                      {t.planning.typeVisite}
                    </Button>
                    {item.store.montage_rayon && (
                      <Button variant="ghost" onClick={() => onAjouter(item.store.id, true)}>
                        {t.planning.typeMontage}
                      </Button>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
