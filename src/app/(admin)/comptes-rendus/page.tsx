"use client";
import { useEffect, useMemo, useState } from "react";
import { Camera, Check, Send, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhotosVisiteAdmin } from "@/components/admin/photos-visite-admin";
import { listPhotosDeVisites, urlsSignees, type PhotoRow } from "@/lib/data/photos";
import { listVisitsPeriode, type VisitRow } from "@/lib/data/planning";
import { listStores, type StoreRow } from "@/lib/data/stores";
import { listAppUsers, type AppUserRow } from "@/lib/data/users";
import type { CompteRendu } from "@/lib/domain/compte-rendu";
import { addDays, formatDate, jourISO, aujourdhuiISO } from "@/lib/dates";
import { t } from "@/lib/i18n/fr-BE";

const HISTORIQUE_JOURS = 30;
type Filtre = "tout" | "photos" | "relais";

export default function ComptesRendusPage() {
  const [visites, setVisites] = useState<VisitRow[]>([]);
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [magasins, setMagasins] = useState<StoreRow[]>([]);
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let monte = true;
    (async () => {
      try {
        const depuis = jourISO(addDays(new Date(), -HISTORIQUE_JOURS));
        const [v, s, u] = await Promise.all([
          listVisitsPeriode(depuis, aujourdhuiISO()),
          listStores(),
          listAppUsers(),
        ]);
        if (!monte) return;
        // Seules les visites réellement rendues portent un compte rendu.
        const rendues = v
          .filter((x) => x.report_submitted_at !== null)
          .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
        setVisites(rendues);
        setMagasins(s);
        setUsers(u);

        const p = await listPhotosDeVisites(rendues.map((x) => x.id));
        if (!monte) return;
        setPhotos(p);
        setUrls(await urlsSignees(p.map((x) => x.storage_path)));
      } catch {
        if (monte) setErreur(t.comptesRendus.loadError);
      } finally {
        if (monte) setLoading(false);
      }
    })();
    return () => {
      monte = false;
    };
  }, []);

  const nomMagasin = useMemo(() => new Map(magasins.map((m) => [m.id, m.name])), [magasins]);
  const surnom = useMemo(() => new Map(users.map((u) => [u.id, u.nickname])), [users]);
  const photosParVisite = useMemo(() => {
    const index = new Map<string, PhotoRow[]>();
    for (const photo of photos) {
      const liste = index.get(photo.visit_id) ?? [];
      liste.push(photo);
      index.set(photo.visit_id, liste);
    }
    return index;
  }, [photos]);

  const affichees = useMemo(
    () =>
      visites.filter((v) => {
        if (filtre === "photos") return (photosParVisite.get(v.id)?.length ?? 0) > 0;
        if (filtre === "relais") return v.relais_centrale;
        return true;
      }),
    [visites, filtre, photosParVisite]
  );

  return (
    <main className="px-4 py-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.12em] text-jrf-800">
            {t.comptesRendus.title}
          </h1>
          <p className="mt-1 text-base text-neutral-700">{t.comptesRendus.subtitle}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["tout", t.comptesRendus.filterAll],
              ["photos", t.comptesRendus.filterPhotos],
              ["relais", t.comptesRendus.filterRelais],
            ] as [Filtre, string][]
          ).map(([valeur, libelle]) => (
            <Button
              key={valeur}
              variant={filtre === valeur ? "default" : "outline"}
              aria-pressed={filtre === valeur}
              onClick={() => setFiltre(valeur)}
            >
              {libelle}
            </Button>
          ))}
        </div>

        {erreur && <p className="text-base text-state-critical">{erreur}</p>}

        {loading ? (
          <p className="text-base text-neutral-500">{t.common.loading}</p>
        ) : affichees.length === 0 ? (
          <p className="rounded-lg border border-border bg-card px-4 py-6 text-base">
            {t.comptesRendus.empty}
          </p>
        ) : (
          <ul className="space-y-3">
            {affichees.map((visite) => {
              const rapport = (visite.report ?? {}) as CompteRendu;
              const sesPhotos = photosParVisite.get(visite.id) ?? [];
              return (
                <li
                  key={visite.id}
                  className="space-y-2 rounded-lg border border-border bg-card px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="break-words text-lg font-semibold">
                      {nomMagasin.get(visite.store_id) ?? "—"}
                    </p>
                    <p className="text-sm text-neutral-500">
                      {formatDate(visite.scheduled_date)} ·{" "}
                      {t.comptesRendus.by(surnom.get(visite.user_id) ?? "")}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {visite.rayon_conforme === true && (
                      <Badge variant="ok">
                        <Check aria-hidden className="size-4" />
                        {t.comptesRendus.shelfOk}
                      </Badge>
                    )}
                    {visite.rayon_conforme === false && (
                      <Badge variant="warning">
                        <X aria-hidden className="size-4" />
                        {t.comptesRendus.shelfNotOk}
                      </Badge>
                    )}
                    {visite.relais_centrale && (
                      <Badge variant="critical">
                        <Send aria-hidden className="size-4" />
                        {t.comptesRendus.relais}
                      </Badge>
                    )}
                    {sesPhotos.length > 0 && (
                      <Badge variant="default">
                        <Camera aria-hidden className="size-4" />
                        {t.comptesRendus.photos(sesPhotos.length)}
                      </Badge>
                    )}
                  </div>

                  {visite.notes && (
                    <p className="break-words text-base text-neutral-700">
                      <span className="text-neutral-500">{t.comptesRendus.notes} : </span>
                      {visite.notes}
                    </p>
                  )}
                  {rapport.ruptures && (
                    <p className="break-words text-base text-neutral-700">
                      <span className="text-neutral-500">{t.comptesRendus.ruptures} : </span>
                      {rapport.ruptures}
                    </p>
                  )}
                  {rapport.message_centrale && (
                    <p className="break-words text-base text-neutral-700">
                      <span className="text-neutral-500">{t.comptesRendus.relais} : </span>
                      {rapport.message_centrale}
                    </p>
                  )}

                  <PhotosVisiteAdmin photos={sesPhotos} urls={urls} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
