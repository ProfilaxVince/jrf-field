"use client";
/**
 * Compression client OBLIGATOIRE avant mise en file (décision du 03/08).
 * Une photo brute de 4 Mo × 3 × 5 visites sature le cache navigateur iOS,
 * qui purge sans prévenir : les photos seraient perdues avant d'être envoyées.
 * Garde-fou en base : `visit_photos.bytes <= 600000`.
 */

export const TAILLE_MAX_OCTETS = 600_000;
const COTE_MAX = 1280;

export type PhotoCompressee = {
  blob: Blob;
  width: number;
  height: number;
  bytes: number;
};

async function chargerImage(fichier: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(fichier);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("image_illisible"));
      image.src = url;
    });
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Redimensionne puis baisse la qualité JPEG jusqu'à passer sous le garde-fou. */
export async function compresserPhoto(fichier: File): Promise<PhotoCompressee> {
  const image = await chargerImage(fichier);
  const ratio = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
  const width = Math.round(image.width * ratio);
  const height = Math.round(image.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const contexte = canvas.getContext("2d");
  if (!contexte) throw new Error("canvas_indisponible");
  contexte.drawImage(image, 0, 0, width, height);

  for (const qualite of [0.8, 0.65, 0.5, 0.4]) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", qualite)
    );
    if (blob && blob.size <= TAILLE_MAX_OCTETS) {
      return { blob, width, height, bytes: blob.size };
    }
  }
  throw new Error("photo_trop_lourde");
}
