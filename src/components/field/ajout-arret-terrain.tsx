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
  onDepannage,
  onFermer,
}: {
  magasins: StoreRow[];
  dejaPrevus: Set<string>;
  onAjouter: (magasin: StoreRow) => void;
  onUrgence: (magasin: StoreRow, description: string) => void;
  onDepannage: (magasin: StoreRow, motif: string) => void;
  onFermer: () => void;
}) {
  const [urgence, setUrgence] = useState<StoreRow | null>(null);
  const [description, setDescription] = useState("");
  const [depannage, setDepannage] = useState<StoreRow | null>(null);
  const [motif, setMotif] = useState("");

  /**
   * Dépannage : rare, souvent le week-end, et jamais sans raison. Le bouton
   * reste inactif tant que le motif est vide — la base refuserait la ligne
   * (contrainte 00017), et un refus de contrainte n'explique rien à quelqu'un
   * qui est dehors, sur son téléphone.
   */
  if (depannage) {
    return (
      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{t.planning.typeDepannage}</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t.planning.close}
            onClick={() => setDepannage(null)}
          >
            <X aria-hidden />
          </Button>
        </div>
        <p className="text-base font-medium">{depannage.name}</p>
        <label className="block space-y-1">
          <span className="text-base">{t.planning.depannageReason}</span>
          <textarea
            className="min-h-20 w-full rounded-md border border-border bg-card px-3 py-2 text-base leading-7"
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
        </label>
        <p className="text-sm leading-6 text-neutral-700">{t.planning.depannageReasonHint}</p>
        <Button
          size="lg"
          className="w-full"
          disabled={!motif.trim()}
          onClick={() => {
            onDepannage(depannage, motif);
            setDepannage(null);
            setMotif("");
            onFermer();
          }}
        >
          {t.field.depannageConfirm}
        </Button>
      </section>
    );
  }

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
            <Button variant="ghost" onClick={() => setDepannage(magasin)}>
              {t.planning.typeDepannage}
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
