"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CompteRenduForm } from "@/components/field/compte-rendu-form";
import { PhotosVisite } from "@/components/field/photos-visite";
import { StatutArretBadge, statutArret } from "@/components/field/statut-arret";
import { demanderPositionUneFois, useTournee } from "@/hooks/use-tournee";
import { SAISIE_VIDE, compteRenduValide, type SaisieCompteRendu } from "@/lib/domain/compte-rendu";
import { formatHeure } from "@/lib/dates";
import { lienItineraire } from "@/lib/maps";
import { t } from "@/lib/i18n/fr-BE";
import { ContactsMagasin } from "@/components/store/contacts-magasin";

export default function VisitePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tournee = useTournee();
  const [saisie, setSaisie] = useState<SaisieCompteRendu>(SAISIE_VIDE);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const visite = useMemo(
    () => tournee.tournee?.visites.find((v) => v.id === params.id) ?? null,
    [tournee.tournee, params.id]
  );
  const magasin = useMemo(
    () => tournee.tournee?.magasins.find((m) => m.id === visite?.store_id) ?? null,
    [tournee.tournee, visite]
  );
  const photos = (tournee.tournee?.photos ?? []).filter((p) => p.visitId === params.id);

  if (tournee.chargement && !visite) {
    return <p className="p-6 text-base text-neutral-500">{t.common.loading}</p>;
  }

  if (!visite) {
    return (
      <main className="min-h-dvh px-4 py-6">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <p className="text-lg">{t.saisieVisite.notFound}</p>
          <Button asChild>
            <Link href="/field">{t.saisieVisite.back}</Link>
          </Button>
        </div>
      </main>
    );
  }

  const statut = statutArret(visite);
  const montage = visite.visit_type === "montage_rayon";

  async function arriver() {
    if (!visite) return;
    setEnCours(true);
    const position = await demanderPositionUneFois();
    await tournee.demarrer(visite.id, position);
    setEnCours(false);
  }

  async function terminer() {
    if (!visite) return;
    setEnCours(true);
    await tournee.terminer(visite.id, saisie, photos.length);
    setEnCours(false);
    router.push("/field");
  }

  /**
   * Reporter n'annule rien : la visite reste dans l'historique avec son motif,
   * et le magasin retrouve sa place dans les priorités (sa dette continue de
   * courir tant qu'aucun compte rendu n'a été soumis).
   */
  async function reporter() {
    if (!visite) return;
    setEnCours(true);
    await tournee.reporter(visite.id, t.saisieVisite.postponeMotif);
    setEnCours(false);
    router.push("/field");
  }

  async function photographier(fichier: File, position: number) {
    if (!visite) return;
    setErreurPhoto(null);
    try {
      await tournee.photographier(visite.id, position, fichier);
    } catch (erreur) {
      setErreurPhoto(
        erreur instanceof Error && erreur.message === "photo_trop_lourde"
          ? t.saisieVisite.photoTooHeavy
          : t.saisieVisite.photoError
      );
    }
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <Button variant="ghost" className="self-start px-2" asChild>
          <Link href="/field">
            <ChevronLeft aria-hidden />
            {t.saisieVisite.back}
          </Link>
        </Button>

        <header className="space-y-1">
          <h1 className="font-display text-xl font-bold uppercase tracking-[0.1em] text-jrf-800">
            {magasin?.name ?? t.saisieVisite.title}
          </h1>
          <p className="text-base text-neutral-700">
            {magasin?.address ? `${magasin.address}, ` : ""}
            {magasin?.postal_code ?? ""} {magasin?.city ?? ""}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <StatutArretBadge statut={statut} />
            {visite.checkin_at && (
              <span className="text-sm text-neutral-500">
                {t.saisieVisite.arrivedAt(formatHeure(visite.checkin_at))}
              </span>
            )}
          </div>
        </header>

        <div className="flex gap-2">
          {magasin && lienItineraire(magasin) && (
            <Button variant="outline" className="flex-1" asChild>
              <a href={lienItineraire(magasin) as string} target="_blank" rel="noreferrer">
                <MapPin aria-hidden />
                {t.field.itinerary}
              </a>
            </Button>
          )}
          {magasin?.fl_manager_phone && (
            <Button variant="outline" className="flex-1" asChild>
              <a href={`tel:${magasin.fl_manager_phone.replace(/\s/g, "")}`}>
                <Phone aria-hidden />
                {t.field.call}
              </a>
            </Button>
          )}
        </div>

        <ContactsMagasin magasin={magasin} />

        {statut === "a_faire" ? (
          <section className="space-y-3">
            <Button size="lg" className="w-full" onClick={arriver} disabled={enCours}>
              {t.saisieVisite.arrived}
            </Button>
            <p className="text-sm leading-6 text-neutral-500">{t.saisieVisite.geolocNotice}</p>
          </section>
        ) : statut === "fait" ? (
          <p className="rounded-lg border border-border bg-card px-4 py-6 text-lg">
            {t.saisieVisite.finished}
          </p>
        ) : (
          <>
            <CompteRenduForm saisie={saisie} onChange={setSaisie} />
            <PhotosVisite photos={photos} onAjouter={photographier} erreur={erreurPhoto} />

            <div className="space-y-2">
              <Button
                size="lg"
                className="w-full"
                onClick={terminer}
                disabled={enCours || !compteRenduValide(saisie)}
              >
                {t.saisieVisite.finish}
              </Button>
              {!compteRenduValide(saisie) && (
                <p className="text-sm text-neutral-500">{t.saisieVisite.finishHint}</p>
              )}
              {montage && <p className="text-sm text-neutral-500">{t.field.montage}</p>}
              <Button variant="outline" size="lg" className="w-full" asChild>
                <Link href={`/field/signaler/${visite.store_id}`}>{t.incidents.report}</Link>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full"
                onClick={reporter}
                disabled={enCours}
              >
                {t.saisieVisite.postpone}
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
