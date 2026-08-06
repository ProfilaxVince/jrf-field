"use client";
import { useEffect, useState } from "react";

/**
 * Réglage numérique à enregistrement automatique : pas de bouton « Enregistrer »,
 * pas de formulaire à valider. On enregistre à la sortie du champ, et on le dit.
 */
export function ReglageNombre({
  libelle,
  valeur,
  pas = 1,
  min = 0,
  onEnregistrer,
}: {
  libelle: string;
  valeur: number;
  pas?: number;
  min?: number;
  onEnregistrer: (valeur: number) => void;
}) {
  const [saisie, setSaisie] = useState(String(valeur));

  useEffect(() => {
    setSaisie(String(valeur));
  }, [valeur]);

  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span className="text-base">{libelle}</span>
      <input
        type="number"
        inputMode="decimal"
        step={pas}
        min={min}
        className="min-h-[44px] w-28 rounded border border-border px-3 text-right text-base"
        value={saisie}
        onChange={(e) => setSaisie(e.target.value)}
        onBlur={() => {
          const nombre = Number(saisie.replace(",", "."));
          if (Number.isFinite(nombre) && nombre !== valeur) onEnregistrer(nombre);
          else setSaisie(String(valeur));
        }}
      />
    </label>
  );
}
