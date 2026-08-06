"use client";
import { t } from "@/lib/i18n/fr-BE";
import type { PhotoRow } from "@/lib/data/photos";

/**
 * Vignettes d'un compte rendu. Les URL sont signées et expirent : elles sont
 * générées à l'ouverture de l'écran, jamais stockées. Cliquer ouvre la photo
 * en pleine taille dans un nouvel onglet — sur un rayon, le détail compte.
 */
export function PhotosVisiteAdmin({
  photos,
  urls,
}: {
  photos: PhotoRow[];
  urls: Map<string, string>;
}) {
  if (photos.length === 0) {
    return <p className="text-sm text-neutral-500">{t.comptesRendus.noPhoto}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((photo) => {
        const url = urls.get(photo.storage_path);
        if (!url) {
          // Le chemin existe en base mais le fichier n'est pas encore arrivé :
          // le téléphone ne l'a pas encore synchronisé.
          return (
            <div
              key={photo.id}
              className="flex size-24 items-center justify-center rounded-md border border-border bg-secondary p-1 text-center text-xs text-neutral-500"
            >
              {t.comptesRendus.photoPending}
            </div>
          );
        }
        return (
          <a
            key={photo.id}
            href={url}
            target="_blank"
            rel="noreferrer"
            title={t.comptesRendus.openPhoto}
          >
            {/* Photo servie par une URL signée temporaire : `next/image` ne peut
                pas l'optimiser sans autoriser le domaine, et le gain serait nul
                sur une image déjà compressée à 600 Ko côté terrain. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={photo.caption ?? ""}
              className="size-24 rounded-md border border-border object-cover"
              loading="lazy"
            />
          </a>
        );
      })}
    </div>
  );
}
