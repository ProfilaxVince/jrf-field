"use client";
import { AlertTriangle, Check, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EtatDette } from "@/lib/domain/types";

/**
 * L'état est porté par FORME + ICÔNE + TEXTE. La couleur n'est que redondante :
 * un daltonien lit « En retard de 9 jours » et voit un triangle, pas une nuance.
 */
const ICONES: Record<EtatDette, typeof Check> = {
  ok: Check,
  warning: Clock,
  critical: AlertTriangle,
};

export function EtatBadge({ etat, libelle }: { etat: EtatDette; libelle: string }) {
  const Icone = ICONES[etat];
  return (
    <Badge variant={etat}>
      <Icone aria-hidden className="size-4" />
      <span>{libelle}</span>
    </Badge>
  );
}
