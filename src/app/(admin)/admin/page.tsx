"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DiagnosticCapaciteCard } from "@/components/admin/diagnostic-capacite";
import { StorePrioriteRow } from "@/components/store/store-priorite-row";
import {
  getDiagnosticCapacite,
  listStorePriorites,
  type DiagnosticCapacite,
  type StorePriorite,
} from "@/lib/data/dette";
import { detteAffichable } from "@/lib/domain/dette";
import { t } from "@/lib/i18n/fr-BE";

const APERCU = 25;

export default function AdminPrioritesPage() {
  const [priorites, setPriorites] = useState<StorePriorite[]>([]);
  const [diagnostic, setDiagnostic] = useState<DiagnosticCapacite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tout, setTout] = useState(false);

  useEffect(() => {
    let monte = true;
    (async () => {
      try {
        const [items, diag] = await Promise.all([listStorePriorites(), getDiagnosticCapacite()]);
        if (!monte) return;
        setPriorites(items);
        setDiagnostic(diag);
      } catch {
        if (monte) setError(t.priorities.loadError);
      } finally {
        if (monte) setLoading(false);
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  const retards = useMemo(
    () => priorites.filter((p) => detteAffichable(p.dette, t.visite).enRetard),
    [priorites]
  );
  const jamaisVus = useMemo(
    () => priorites.filter((p) => p.dette.last_visit_at === null).length,
    [priorites]
  );

  const liste = tout ? priorites : retards.slice(0, APERCU);

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
            {t.priorities.title}
          </h1>
          <p className="mt-1 text-base text-neutral-700">{t.priorities.subtitle}</p>
        </div>

        <DiagnosticCapaciteCard diagnostic={diagnostic} />

        {error && <p className="text-base text-state-critical">{error}</p>}

        {loading ? (
          <p className="text-base text-neutral-500">{t.common.loading}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base text-neutral-700">
                {t.priorities.lateCount(retards.length)}{" "}
                {jamaisVus > 0 ? t.priorities.neverSeenCount(jamaisVus) : ""}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setTout((v) => !v)}>
                  {tout ? t.priorities.showLateOnly : t.priorities.showAll}
                </Button>
                <Button asChild>
                  <Link href="/planning">{t.nav.planning}</Link>
                </Button>
              </div>
            </div>

            {liste.length === 0 ? (
              <p className="rounded-lg border border-border bg-card px-4 py-6 text-center text-lg">
                {t.priorities.empty}
              </p>
            ) : (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {liste.map((item) => (
                  <StorePrioriteRow key={item.store.id} item={item} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </main>
  );
}
