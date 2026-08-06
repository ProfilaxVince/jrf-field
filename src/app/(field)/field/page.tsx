"use client";
import { useMemo } from "react";
import Link from "next/link";
import { CloudOff, RefreshCw, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatutArretBadge, statutArret } from "@/components/field/statut-arret";
import { useTournee } from "@/hooks/use-tournee";
import { useSession } from "@/lib/session";
import { formatJourLong } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";

export default function TourneeDuJourPage() {
  const { nickname, logout } = useSession();
  const tournee = useTournee();

  const magasins = useMemo(
    () => new Map((tournee.tournee?.magasins ?? []).map((m) => [m.id, m])),
    [tournee.tournee]
  );
  const arrets = tournee.tournee?.visites ?? [];
  const restants = arrets.filter((v) => {
    const statut = statutArret(v);
    return statut === "a_faire" || statut === "en_cours";
  });
  const prochain = restants[0];

  return (
    <main className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <header>
          <p className="text-sm uppercase tracking-[0.2em] text-jrf-800/80">
            {nickname ?? t.field.title}
          </p>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
            {t.field.title}
          </h1>
          <p className="mt-1 text-base capitalize text-neutral-700">{formatJourLong(new Date())}</p>
        </header>

        {tournee.depuisCache && (
          <p className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-base text-neutral-700">
            <CloudOff aria-hidden className="size-5 shrink-0" />
            {t.field.offlineData}
          </p>
        )}

        {tournee.enAttente > 0 && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <span className="text-base">{t.field.pending(tournee.enAttente)}</span>
            <Button variant="outline" onClick={tournee.synchroniser}>
              <RefreshCw aria-hidden />
              {t.field.sync}
            </Button>
          </div>
        )}

        {tournee.chargement && arrets.length === 0 ? (
          <p className="text-base text-neutral-500">{t.common.loading}</p>
        ) : arrets.length === 0 ? (
          <p className="rounded-lg border border-border bg-card px-4 py-6 text-lg">{t.field.empty}</p>
        ) : (
          <>
            <p className="text-base text-neutral-700">
              {restants.length > 0 ? t.field.remaining(restants.length) : t.field.allDone}
            </p>

            {prochain && (
              <Button size="lg" className="w-full" asChild>
                <Link href={`/field/visite/${prochain.id}`}>
                  {t.field.next} — {magasins.get(prochain.store_id)?.name ?? ""}
                </Link>
              </Button>
            )}

            <ul className="space-y-2">
              {arrets.map((visit) => {
                const magasin = magasins.get(visit.store_id);
                const montage = visit.visit_type === "montage_rayon";
                return (
                  <li key={visit.id}>
                    <Link
                      href={`/field/visite/${visit.id}`}
                      className="flex min-h-[64px] items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold">
                          {montage && (
                            <Sunrise aria-hidden className="mr-1 inline size-4 align-[-2px]" />
                          )}
                          {magasin?.name ?? "—"}
                        </p>
                        <p className="truncate text-sm text-neutral-500">
                          {montage ? t.field.montage : (magasin?.city ?? "")}
                        </p>
                      </div>
                      <StatutArretBadge statut={statutArret(visit)} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <Button variant="secondary" onClick={() => logout()}>
          {t.auth.signOut}
        </Button>
      </div>
    </main>
  );
}
