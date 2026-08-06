"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n/fr-BE";
import type { DiagnosticCapacite } from "@/lib/data/dette";

/**
 * Un verdict en clair, pas 185 alertes rouges (décision du 03/08).
 * Le chiffre qui compte est la marge : ce qu'il reste — ou ce qu'il manque —
 * chaque semaine une fois les montages de rayon déduits.
 */
export function DiagnosticCapaciteCard({ diagnostic }: { diagnostic: DiagnosticCapacite | null }) {
  if (!diagnostic || diagnostic.verdict === null) {
    return null;
  }

  const marge = diagnostic.marge ?? 0;
  const insuffisant = diagnostic.verdict === "insuffisant" || diagnostic.verdict === "impossible";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.capacite.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`text-lg font-semibold ${
            insuffisant ? "text-state-critical" : diagnostic.verdict === "tendu" ? "text-state-warning" : "text-state-ok"
          }`}
        >
          {t.capacite.verdictLabels[diagnostic.verdict] ?? diagnostic.verdict}
        </p>
        <ul className="mt-2 space-y-1 text-base text-neutral-700">
          <li>
            {t.capacite.capaciteTotale(Math.round(diagnostic.capacite_totale ?? 0))}
            {(diagnostic.consomme_par_montage ?? 0) > 0
              ? `, ${t.capacite.dontMontage(Math.round(diagnostic.consomme_par_montage ?? 0))}`
              : ""}
          </li>
          <li>{t.capacite.besoin(Math.round(diagnostic.besoin_theorique ?? 0))}</li>
          <li className="font-medium">{t.capacite.marge(Math.round(marge))}</li>
        </ul>
      </CardContent>
    </Card>
  );
}
