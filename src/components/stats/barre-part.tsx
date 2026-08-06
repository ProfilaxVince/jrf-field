"use client";

/**
 * Barre de proportion — pas de bibliothèque de graphiques pour trois barres.
 * La valeur est TOUJOURS écrite en chiffres à côté : la barre illustre,
 * elle ne porte jamais l'information seule.
 */
export function BarrePart({
  libelle,
  valeur,
  maximum,
  chiffre,
  accent = false,
}: {
  libelle: string;
  valeur: number;
  maximum: number;
  chiffre: string;
  accent?: boolean;
}) {
  const largeur = maximum > 0 ? Math.min(100, Math.round((valeur / maximum) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base">{libelle}</span>
        <span className="shrink-0 text-base font-semibold tabular-nums">{chiffre}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
        role="presentation"
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${largeur}%`,
            backgroundColor: accent ? "var(--state-warning)" : "var(--jrf-green-500)",
          }}
        />
      </div>
    </div>
  );
}
