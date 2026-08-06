"use client";
import { useState } from "react";
import { Siren, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SelecteurMagasin } from "@/components/store/selecteur-magasin";
import { t } from "@/lib/i18n/fr-BE";
import type { StoreRow } from "@/lib/data/stores";

/**
 * Ajout d'un arrêt par le commercial lui-même — visite normale, ou urgence de
 * livraison. L'urgence n'est pas un type de visite parmi d'autres : elle passe
 * en tête de journée, prévient le responsable et annule le montage du matin.
 * Elle mérite donc son propre geste, pas une case à cocher.
 */
export function AjoutArretTerrain({
  magasins,
  dejaPrevus,
  onAjouter,
  onUrgence,
  onFermer,
}: {
  magasins: StoreRow[];
  dejaPrevus: Set<string>;
  onAjouter: (magasin: StoreRow) => void;
  onUrgence: (magasin: StoreRow, description: string) => void;
  onFermer: () => void;
}) {
  const [urgence, setUrgence] = useState<StoreRow | null>(null);
  const [description, setDescription] = useState("");

  if (urgence) {
    return (
      <section className="space-y-4 rounded-lg border border-state-warning/40 bg-state-warning-tint p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-state-warning">
            {t.field.urgenceTitle}
          </h2>
          <Button variant="ghost" size="icon" aria-label={t.planning.close} onClick={() => setUrgence(null)}>
            <X aria-hidden />
          </Button>
        </div>
        <p className="text-base font-medium">{urgence.name}</p>
        <p className="text-sm leading-6 text-neutral-700">{t.field.urgenceHelp}</p>
        <label className="block space-y-1">
          <span className="text-base">{t.field.urgenceWhat}</span>
          <textarea
            className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-base leading-7"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            onUrgence(urgence, description);
            setUrgence(null);
            setDescription("");
            onFermer();
          }}
        >
          <Siren aria-hidden />
          {t.field.urgenceConfirm}
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t.field.addStopTitle}</h2>
        <Button variant="ghost" size="icon" aria-label={t.planning.close} onClick={onFermer}>
          <X aria-hidden />
        </Button>
      </div>

      <SelecteurMagasin
        magasins={magasins}
        exclus={dejaPrevus}
        libelleExclu={t.planning.alreadyPlanned}
        actions={(magasin) => (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                onAjouter(magasin);
                onFermer();
              }}
            >
              {t.field.asVisite}
            </Button>
            <Button variant="ghost" onClick={() => setUrgence(magasin)}>
              {t.field.asUrgence}
            </Button>
          </div>
        )}
      />
    </section>
  );
}
