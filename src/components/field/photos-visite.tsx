"use client";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { STORE_BLOBS, idbGet } from "@/lib/data/idb";
import { t } from "@/lib/i18n/fr-BE";
import type { PhotoLocale } from "@/lib/data/tournee";

const MAX_PHOTOS = 3;

/** Vignette lue depuis IndexedDB : la photo est visible avant même d'être envoyée. */
function Vignette({ blobKey }: { blobKey: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let actif = true;
    let objectUrl: string | null = null;
    idbGet<{ key: string; blob: Blob }>(STORE_BLOBS, blobKey)
      .then((entree) => {
        if (!actif || !entree) return;
        objectUrl = URL.createObjectURL(entree.blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      actif = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blobKey]);

  if (!url) return <div className="size-20 rounded-md border border-border bg-secondary" />;
  // Photo locale (blob:) : `next/image` n'apporte rien ici et refuse les URLs blob.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="size-20 rounded-md border border-border object-cover" />;
}

export function PhotosVisite({
  photos,
  onAjouter,
  erreur,
}: {
  photos: PhotoLocale[];
  onAjouter: (fichier: File, position: number) => void;
  erreur: string | null;
}) {
  const complet = photos.length >= MAX_PHOTOS;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{t.saisieVisite.photos}</h2>
      <div className="flex flex-wrap gap-2">
        {photos.map((photo) => (
          <Vignette key={photo.blobKey} blobKey={photo.blobKey} />
        ))}
      </div>
      <p className="text-sm text-neutral-500">{t.saisieVisite.photoCount(photos.length)}</p>
      {erreur && <p className="text-base text-state-critical">{erreur}</p>}
      <label className={complet ? "hidden" : "block"}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const fichier = e.target.files?.[0];
            e.target.value = "";
            if (fichier) onAjouter(fichier, photos.length + 1);
          }}
        />
        <Button variant="outline" size="lg" className="w-full" asChild>
          <span>
            <Camera aria-hidden />
            {t.saisieVisite.addPhoto}
          </span>
        </Button>
      </label>
    </section>
  );
}
