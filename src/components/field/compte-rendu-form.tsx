"use client";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";
import type { SaisieCompteRendu } from "@/lib/domain/compte-rendu";

const CHAMP =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-base leading-7 min-h-[44px]";

/**
 * Saisie au pouce, en extérieur : une question fermée d'abord (deux cibles
 * larges), le reste facultatif. Aucun champ obligatoire en dehors de l'état
 * du rayon — un compte rendu qui demande dix champs ne sera pas rempli.
 */
export function CompteRenduForm({
  saisie,
  onChange,
}: {
  saisie: SaisieCompteRendu;
  onChange: (saisie: SaisieCompteRendu) => void;
}) {
  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="text-lg font-semibold">{t.saisieVisite.shelfQuestion}</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <Button
            type="button"
            size="lg"
            variant={saisie.rayonConforme === true ? "default" : "outline"}
            aria-pressed={saisie.rayonConforme === true}
            onClick={() => onChange({ ...saisie, rayonConforme: true })}
          >
            {t.saisieVisite.shelfOk}
          </Button>
          <Button
            type="button"
            size="lg"
            variant={saisie.rayonConforme === false ? "default" : "outline"}
            aria-pressed={saisie.rayonConforme === false}
            onClick={() => onChange({ ...saisie, rayonConforme: false })}
          >
            {t.saisieVisite.shelfNotOk}
          </Button>
        </div>
      </fieldset>

      <label className="block space-y-1">
        <span className="text-base font-medium">{t.saisieVisite.notes}</span>
        <textarea
          className={`${CHAMP} min-h-24`}
          placeholder={t.saisieVisite.notesPlaceholder}
          value={saisie.notes}
          onChange={(e) => onChange({ ...saisie, notes: e.target.value })}
        />
      </label>

      <label className="block space-y-1">
        <span className="text-base font-medium">{t.saisieVisite.ruptures}</span>
        <input
          className={CHAMP}
          value={saisie.ruptures}
          onChange={(e) => onChange({ ...saisie, ruptures: e.target.value })}
        />
      </label>

      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <label className="flex min-h-[44px] items-center gap-3">
          <input
            type="checkbox"
            className="size-6"
            checked={saisie.relaisCentrale}
            onChange={(e) => onChange({ ...saisie, relaisCentrale: e.target.checked })}
          />
          <span className="text-base font-medium">{t.saisieVisite.relais}</span>
        </label>
        {saisie.relaisCentrale && (
          <label className="block space-y-1">
            <span className="text-base">{t.saisieVisite.relaisMessage}</span>
            <textarea
              className={`${CHAMP} min-h-20`}
              value={saisie.messageCentrale}
              onChange={(e) => onChange({ ...saisie, messageCentrale: e.target.value })}
            />
          </label>
        )}
      </div>
    </div>
  );
}
