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
 *
 * ── Pourquoi le cadre est devenu réglable ───────────────────────────────────
 *
 * La taille était écrite en dur — `h-16 w-16`, un carré de 64 px. Ça convient à
 * une ligne de liste, et à rien d'autre. La garde-robe est maintenant une
 * grille de photos en portrait qui occupent toute leur cellule : c'est la photo
 * qui doit porter l'écran, pas une vignette posée à côté d'un texte.
 *
 * `frame` porte donc les classes du CADRE, et `frame` seul. Le recadrage
 * interne, lui, ne change pas d'un cas à l'autre — c'est le même calcul.
 */
export function GarmentThumb({
  imageUrl,
  cropBox,
  alt,
  frame = "h-16 w-16 flex-none",
}: {
  imageUrl: string;
  cropBox: CropBox | null;
  alt: string;
  /** Classes du cadre. Défaut : la vignette carrée des listes. */
  frame?: string;
}) {
  if (!imageUrl) {
    return <div className={`${frame} bg-surface-sunken`} />;
  }

  if (!cropBox) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={alt} className={`${frame} object-cover`} />
    );
  }

  const scaleX = 100 / Math.max(cropBox.width, 1);
  const scaleY = 100 / Math.max(cropBox.height, 1);

  return (
    <div className={`${frame} overflow-hidden bg-surface-sunken`}>
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
