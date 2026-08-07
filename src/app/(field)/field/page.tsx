"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  CloudOff,
  MapPin,
  Plus,
  RefreshCw,
  Siren,
  Sunrise,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AjoutArretTerrain } from "@/components/field/ajout-arret-terrain";
import { StatutArretBadge, statutArret } from "@/components/field/statut-arret";
import { useTournee } from "@/hooks/use-tournee";
import { useSession } from "@/lib/session";
import { formatJourLong } from "@/lib/dates";
import { lienItineraire } from "@/lib/maps";
import { t } from "@/lib/i18n/fr-BE";

export default function TourneeDuJourPage() {
  const { nickname, logout } = useSession();
  const tournee = useTournee();
  const [ajout, setAjout] = useState(false);
  const [edition, setEdition] = useState(false);

  const magasins = useMemo(
    () => new Map((tournee.tournee?.magasins ?? []).map((m) => [m.id, m])),
    [tournee.tournee]
  );
  const arrets = useMemo(() => tournee.tournee?.visites ?? [], [tournee.tournee]);
  const restants = arrets.filter((v) => {
    const statut = statutArret(v);
    return statut === "a_faire" || statut === "en_cours";
  });
  const prochain = restants[0];
  const dejaPrevus = useMemo(() => new Set(arrets.map((v) => v.store_id)), [arrets]);
  const modifiables = arrets.filter(
    (v) => v.status === "planifiee" && v.visit_type !== "montage_rayon"
  ).length;

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

            {prochain && !edition && (
              <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                <p className="text-sm uppercase tracking-[0.15em] text-neutral-500">
                  {t.field.next}
                </p>
                <p className="text-lg font-semibold">
                  {magasins.get(prochain.store_id)?.name ?? ""}
                </p>
                <p className="text-base text-neutral-600">
                  {magasins.get(prochain.store_id)?.address ?? ""}
                  {magasins.get(prochain.store_id)?.address ? " · " : ""}
                  {magasins.get(prochain.store_id)?.postal_code ?? ""}{" "}
                  {magasins.get(prochain.store_id)?.city ?? ""}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button size="lg" className="flex-1" asChild>
                    <Link href={`/field/visite/${prochain.id}`}>{t.field.open}</Link>
                  </Button>
                  {(() => {
                    const magasin = magasins.get(prochain.store_id);
                    const lien = magasin ? lienItineraire(magasin) : null;
                    return lien ? (
                      <Button size="lg" variant="outline" className="flex-1" asChild>
                        <a href={lien} target="_blank" rel="noreferrer">
                          <MapPin aria-hidden />
                          {t.field.startRoute}
                        </a>
                      </Button>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="flex-1" onClick={() => setAjout((v) => !v)}>
                <Plus aria-hidden />
                {t.field.addStop}
              </Button>
              {modifiables > 0 && (
                <Button variant="ghost" className="flex-1" onClick={() => setEdition((v) => !v)}>
                  {edition ? t.field.editDone : t.field.edit}
                </Button>
              )}
            </div>

            {ajout && (
              <AjoutArretTerrain
                magasins={tournee.catalogue}
                dejaPrevus={dejaPrevus}
                onAjouter={(magasin) => tournee.ajouterArret(magasin, "conseil")}
                onUrgence={(magasin, description) => tournee.declarerUrgence(magasin, description)}
                onDepannage={(magasin, motif) =>
                  tournee.ajouterArret(magasin, "depannage", motif)
                }
                onFermer={() => setAjout(false)}
              />
            )}

            <ul className="space-y-2">
              {arrets.map((visit) => {
                const magasin = magasins.get(visit.store_id);
                const montage = visit.visit_type === "montage_rayon";
                const urgent = visit.visit_type === "urgence";
                const deplacable = visit.status === "planifiee" && !montage && !urgent;
                const contenu = (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-lg font-semibold">
                        {montage && (
                          <Sunrise aria-hidden className="mr-1 inline size-4 align-[-2px]" />
                        )}
                        {urgent && (
                          <Siren
                            aria-hidden
                            className="mr-1 inline size-4 align-[-2px] text-state-warning"
                          />
                        )}
                        {magasin?.name ?? "—"}
                      </p>
                      <p className="break-words text-sm text-neutral-500">
                        {montage
                          ? t.field.montage
                          : urgent
                            ? t.field.urgence
                            : (magasin?.city ?? "")}
                      </p>
                    </div>
                    <StatutArretBadge statut={statutArret(visit)} />
                  </>
                );

                return (
                  <li key={visit.id}>
                    {edition ? (
                      <div className="flex min-h-[64px] items-center gap-1 rounded-lg border border-border bg-card px-3 py-3">
                        {contenu}
                        {deplacable && (
                          <>
                            <button
                              type="button"
                              aria-label={t.field.moveUp}
                              onClick={() => tournee.deplacerArret(visit.id, -1)}
                              className="flex size-11 items-center justify-center rounded-md hover:bg-secondary"
                            >
                              <ChevronUp aria-hidden className="size-5" />
                            </button>
                            <button
                              type="button"
                              aria-label={t.field.moveDown}
                              onClick={() => tournee.deplacerArret(visit.id, 1)}
                              className="flex size-11 items-center justify-center rounded-md hover:bg-secondary"
                            >
                              <ChevronDown aria-hidden className="size-5" />
                            </button>
                          </>
                        )}
                        {visit.status === "planifiee" && (
                          <button
                            type="button"
                            aria-label={t.field.removeStop}
                            onClick={() => tournee.retirerArret(visit.id, t.field.removeMotif)}
                            className="flex size-11 items-center justify-center rounded-md hover:bg-secondary"
                          >
                            <X aria-hidden className="size-5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <Link
                        href={`/field/visite/${visit.id}`}
                        className="flex min-h-[64px] items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
                      >
                        {contenu}
                      </Link>
                    )}
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
