"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft, Printer, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";
import { RapportImprimable } from "@/components/store/rapport-imprimable";
import { chargerRapportMagasin } from "@/lib/data/rapport-magasin";
import { exporterRapportMagasin } from "@/lib/data/exports";
import { detailErreur } from "@/lib/data/erreurs";
import type { RapportMagasin } from "@/lib/domain/rapport-magasin";

/** 12 mois par défaut : une année complète se compare, un trimestre non. */
const PERIODES = [6, 12, 24];

/**
 * Le rapport d'un magasin, prêt à sortir devant l'adhérent.
 *
 * Écran séparé, comme les feuilles de route : à l'impression tout ce qui n'est
 * pas le rapport doit disparaître, et masquer la moitié d'un écran de gestion
 * au `@media print` casse à la première évolution.
 */
export default function RapportMagasinPage() {
  const params = useParams<{ id: string }>();
  const storeId = params?.id ?? "";
  const [mois, setMois] = useState(12);
  const [interne, setInterne] = useState(false);
  const [rapport, setRapport] = useState<RapportMagasin | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const charger = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      setRapport(await chargerRapportMagasin(storeId, mois));
      setErreur(null);
    } catch (e) {
      setErreur(detailErreur(e) || t.stores.reportLoadError);
    } finally {
      setLoading(false);
    }
  }, [storeId, mois]);

  useEffect(() => {
    charger();
  }, [charger]);

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 print:hidden">
        <Button variant="ghost" className="self-start px-2" asChild>
          <Link href="/stores">
            <ChevronLeft aria-hidden />
            {t.common.back}
          </Link>
        </Button>

        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
          {rapport ? t.stores.reportTitle(rapport.magasin.nom) : t.stores.reportOpen}
        </h1>

        <div className="flex flex-wrap gap-2">
          {PERIODES.map((n) => (
            <Button
              key={n}
              variant={mois === n ? "default" : "outline"}
              aria-pressed={mois === n}
              onClick={() => setMois(n)}
            >
              {t.stores.reportMonths(n)}
            </Button>
          ))}
        </div>

        {/* La case est DÉCOCHÉE par défaut. Le rapport part chez le client :
            le mode le plus prudent doit être celui qu'on obtient sans rien
            faire. */}
        <label className="flex min-h-[44px] items-start gap-2 text-base">
          <input
            type="checkbox"
            className="mt-1 size-5 shrink-0"
            checked={interne}
            onChange={(e) => setInterne(e.target.checked)}
          />
          <span>
            {t.stores.reportInternal}
            <span className="block text-sm text-neutral-600">{t.stores.reportInternalHint}</span>
          </span>
        </label>

        {erreur && <p className="text-base text-[color:var(--state-critical)]">{erreur}</p>}
        {loading && <p className="text-base text-neutral-600">{t.common.loading}</p>}

        {rapport && !loading && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => window.print()}>
              <Printer aria-hidden />
              {t.stores.reportPrint}
            </Button>
            <Button
              variant="secondary"
              onClick={() => exporterRapportMagasin(rapport, interne)}
            >
              <Table aria-hidden />
              {t.stores.reportExcel}
            </Button>
          </div>
        )}
      </div>

      {/* L'aperçu à l'écran EST ce qui sortira sur papier. */}
      {rapport && (
        <div className="mx-auto mt-6 w-full max-w-3xl print:mt-0 print:max-w-none">
          <RapportImprimable rapport={rapport} interne={interne} />
        </div>
      )}
    </main>
  );
}
