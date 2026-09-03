/**
 * Réduire la photo AVANT de l'envoyer.
 *
 * ⚠️ C'était le premier tiers de l'attente, et personne ne le voyait : la photo
 * d'un téléphone récent pèse 3 à 12 Mo pour 4000×3000 pixels. Elle partait
 * telle quelle vers le stockage, puis Anthropic allait la rechercher à la même
 * taille. Sur de la 4G, l'envoi seul prenait plusieurs secondes pendant
 * lesquelles l'écran affichait « Envoi de ta photo… » sans que rien ne bouge.
 *
 * Or ces pixels ne servent à rien : le modèle ramène de toute façon l'image à
 * environ 1,15 mégapixel avant de la lire. Envoyer davantage, c'est payer du
 * transfert et de l'attente pour une information qui sera jetée à l'arrivée.
 *
 * 1280 px sur le grand côté suffit donc largement à reconnaître une veste, une
 * couleur ou une matière, et ramène le fichier autour de 200 Ko — soit un ordre
 * de grandeur de moins.
 */

/** Grand côté visé. Au-dessus, le modèle réduit lui-même : c'est du transfert perdu. */
export const MAX_EDGE = 1280;

/** Compromis poids/qualité usuel du JPEG : au-delà le fichier grossit sans gain visible. */
export const JPEG_QUALITY = 0.85;

/**
 * Dimensions réduites en conservant les proportions.
 *
 * Séparée du reste parce que c'est la seule partie qui peut se tromper
 * silencieusement — un arrondi qui déforme l'image, un zéro qui casse le canvas
 * — et la seule qui se teste sans navigateur.
 *
 * Une image déjà plus petite que le plafond est renvoyée inchangée : l'agrandir
 * n'ajouterait aucun détail et ne ferait que gonfler le fichier.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge = MAX_EDGE
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }

  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const ratio = maxEdge / longest;

  // `max(1, …)` : une image très allongée pourrait voir son petit côté tomber à
  // 0 par arrondi, et un canvas de largeur nulle lève une exception.
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Réduit une photo côté navigateur, avant l'envoi.
 *
 * En cas d'échec — format exotique, canvas indisponible, image illisible — on
 * rend le fichier d'origine plutôt que de bloquer : une analyse lente vaut
 * mieux qu'une analyse impossible.
 */
export async function downscaleImage(
  file: File,
  maxEdge = MAX_EDGE
): Promise<{ file: File; shrunk: boolean }> {
  try {
    // ⚠️ Laisser le navigateur PEINDRE avant de commencer.
    //
    // Décoder puis ré-encoder une photo de 12 mégapixels occupe le fil
    // principal plusieurs secondes sur un téléphone. Appelée aussitôt après le
    // `setState` de l'aperçu, cette fonction retardait l'affichage de la photo
    // d'autant : on venait de la prendre et l'écran restait vide.
    //
    // Deux trames d'attente suffisent : la première laisse React produire le
    // rendu, la seconde laisse le navigateur l'afficher. Le redimensionnement
    // ne commence qu'après, et le décalage devient invisible.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );

    const probe = await createImageBitmap(file);
    const target = fitWithin(probe.width, probe.height, maxEdge);
    const already = target.width === probe.width && target.height === probe.height;
    probe.close();

    if (already) return { file, shrunk: false };

    // Redimensionné par le décodeur plutôt que par le canvas : le navigateur
    // le fait hors du fil principal, là où `drawImage` sur une image pleine
    // résolution le bloque.
    const bitmap = await createImageBitmap(file, {
      resizeWidth: target.width,
      resizeHeight: target.height,
      resizeQuality: "high",
    });

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;

    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return { file, shrunk: false };
    }

    context.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );

    // Une photo déjà bien compressée peut ressortir plus lourde après un
    // ré-encodage : dans ce cas l'original est le meilleur des deux.
    if (!blob || blob.size >= file.size) return { file, shrunk: false };

    return {
      file: new File([blob], replaceExtension(file.name), { type: "image/jpeg" }),
      shrunk: true,
    };
  } catch {
    return { file, shrunk: false };
  }
}

/** Le contenu devient du JPEG : le nom doit suivre, sinon le type deviné est faux. */
export function replaceExtension(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "photo"}.jpg`;
}
