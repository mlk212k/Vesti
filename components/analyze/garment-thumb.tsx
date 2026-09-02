"use client";

import type { CropBox } from "@/lib/claude/schemas";

/**
 * Vignette d'une pièce, découpée dans la photo de l'utilisateur.
 *
 * On n'a pas de photo catalogue (on ne connaît pas la référence exacte du
 * vêtement), donc on montre la pièce telle qu'elle est sur SA photo. Le
 * recadrage est purement CSS à partir de la boîte renvoyée par le modèle :
 * aucun retraitement d'image serveur, aucun fichier supplémentaire à stocker.
 *
 * Le zoom = 100/largeur : on agrandit l'image pour que la boîte remplisse le
 * cadre, puis on la décale pour amener la boîte à l'origine.
 */
export function GarmentThumb({
  imageUrl,
  cropBox,
  alt,
}: {
  imageUrl: string;
  cropBox: CropBox | null;
  alt: string;
}) {
  if (!imageUrl) {
    return <div className="h-16 w-16 flex-none rounded-xl bg-border" />;
  }

  if (!cropBox) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        className="h-16 w-16 flex-none rounded-xl object-cover"
      />
    );
  }

  const scaleX = 100 / Math.max(cropBox.width, 1);
  const scaleY = 100 / Math.max(cropBox.height, 1);

  return (
    <div className="h-16 w-16 flex-none overflow-hidden rounded-xl bg-border">
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={alt}
          className="absolute max-w-none origin-top-left object-cover"
          style={{
            width: `${scaleX * 100}%`,
            height: `${scaleY * 100}%`,
            left: `${-cropBox.x * scaleX}%`,
            top: `${-cropBox.y * scaleY}%`,
          }}
        />
      </div>
    </div>
  );
}
