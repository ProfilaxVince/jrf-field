"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Printer, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n/fr-BE";
import { FeuilleImprimable } from "@/components/planning/feuille-imprimable";
import { chargerFeuilles } from "@/lib/data/feuilles";
import { exporterFeuillesTableur } from "@/lib/data/exports";
import { aujourdhuiISO } from "@/lib/dates";
import type { FeuilleCommercial } from "@/lib/domain/feuille-semaine";

/**
 * Les feuilles de semaine, prêtes à imprimer ou à ouvrir dans Excel.
 *
 * Écran séparé plutôt qu'un panneau dans la Semaine : à l'impression, tout ce
 * qui n'est pas la feuille doit disparaître — barre de navigation, boutons,
 * titres. Sur une page qui sert aussi à planifier, ça voudrait dire masquer
 * la moitié de l'écran au `@media print` et vivre avec le risque d'en oublier
 * un morceau à chaque évolution.
 */
export default function FeuillesSemainePage() {
  const [semaines, setSemaines] = useState(1);
  const [feuilles, setFeuilles] = useState<FeuilleCommercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);

  const charger = useCallback(async () => {
    setLoading(true);
    try {
      setFeuilles(await chargerFeuilles(new Date(), semaines));
      setErreur(false);
    } catch {
      setErreur(true);
    } finally {
      setLoading(false);
    }
  }, [semaines]);

  useEffect(() => {
    charger();
  }, [charger]);

  const avecArrets = feuilles.filter((f) => f.total > 0);

  return (
    <main className="px-4 py-6">
      {/* Tout ce bloc disparaît à l'impression : seules les feuilles sortent. */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 print:hidden">
        <Button variant="ghost" className="self-start px-2" asChild>
          <Link href="/planning">
            <ChevronLeft aria-hidden />
            {t.common.back}
          </Link>
        </Button>

        <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
          {t.planning.sheetTitle}
        </h1>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={semaines === 1 ? "default" : "outline"}
            aria-pressed={semaines === 1}
            onClick={() => setSemaines(1)}
          >
            {t.planning.sheetOneWeek}
          </Button>
          <Button
            variant={semaines === 2 ? "default" : "outline"}
            aria-pressed={semaines === 2}
            onClick={() => setSemaines(2)}
          >
            {t.planning.sheetTwoWeeks}
          </Button>
        </div>

        {erreur && <p className="text-base text-state-critical">{t.planning.sheetLoadError}</p>}
        {loading && <p className="text-base text-neutral-600">{t.common.loading}</p>}

        {!loading && !erreur && avecArrets.length === 0 && (
          <p className="text-base text-neutral-700">{t.planning.sheetEmpty}</p>
        )}

        {!loading && avecArrets.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => window.print()}>
                <Printer aria-hidden />
                {t.planning.sheetPrint}
              </Button>
              <Button
                variant="secondary"
                onClick={() => exporterFeuillesTableur(avecArrets, aujourdhuiISO())}
              >
                <Table aria-hidden />
                {t.planning.sheetExcel}
              </Button>
            </div>
            <p className="text-base text-neutral-700">{t.planning.sheetPrintHint}</p>
          </>
        )}
      </div>

      {/* L'aperçu à l'écran EST ce qui sortira sur papier : pas de surprise
          au moment d'imprimer, Gérardo voit avant de lancer. */}
      <div className="mx-auto mt-6 w-full max-w-4xl space-y-10 print:mt-0 print:max-w-none print:space-y-0">
        {avecArrets.map((feuille) => (
          <FeuilleImprimable key={feuille.userId} feuille={feuille} />
        ))}
      </div>
    </main>
  );
}
