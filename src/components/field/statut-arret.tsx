"use client";
import { Check, CircleDot, Clock, SkipForward } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n/fr-BE";
import type { VisitRow } from "@/lib/data/planning";

export type StatutArret = "fait" | "en_cours" | "a_faire" | "reporte";

export function statutArret(visit: VisitRow): StatutArret {
  if (visit.status === "faite") return "fait";
  if (visit.status === "reportee" || visit.status === "annulee") return "reporte";
  return visit.checkin_at ? "en_cours" : "a_faire";
}

const RENDU: Record<StatutArret, { icone: typeof Check; libelle: string; variante: "ok" | "default" | "warning" }> = {
  fait: { icone: Check, libelle: t.field.statusDone, variante: "ok" },
  en_cours: { icone: CircleDot, libelle: t.field.statusInProgress, variante: "warning" },
  a_faire: { icone: Clock, libelle: t.field.statusTodo, variante: "default" },
  reporte: { icone: SkipForward, libelle: t.field.statusPostponed, variante: "default" },
};

export function StatutArretBadge({ statut }: { statut: StatutArret }) {
  const { icone: Icone, libelle, variante } = RENDU[statut];
  return (
    <Badge variant={variante}>
      <Icone aria-hidden className="size-4" />
      {libelle}
    </Badge>
  );
}
