/**
 * Ce qu'on garde d'une position, et ce qu'on jette.
 *
 * ⚠️ L'arrondi n'est PAS une optimisation, c'est la promesse faite à
 * l'utilisateur. Le GPS d'un téléphone rend une position à quelques mètres
 * près : conservée telle quelle, la base contiendrait l'adresse du domicile de
 * chaque personne inscrite. Deux décimales valent environ 1,1 km — assez pour
 * savoir le temps qu'il fait, trop grossier pour désigner une maison.
 *
 * L'arrondi se fait donc CÔTÉ SERVEUR. Il était fait par le composant qui lit
 * le GPS, c'est-à-dire par le client : n'importe quel appel forgé pouvait
 * enregistrer la position exacte, et la promesse ne tenait qu'à la bonne
 * volonté du navigateur.
 */

/** ~1,1 km. Le pas de la grille sur laquelle on range les gens. */
export const COORDINATE_DECIMALS = 2;

export const LATITUDE = { min: -90, max: 90 } as const;
export const LONGITUDE = { min: -180, max: 180 } as const;

export interface CoarseLocation {
  latitude: number;
  longitude: number;
}

/**
 * Ramène une position à la grille, ou rend `null` si elle n'a aucun sens.
 *
 * Rendre `null` plutôt que de corriger : une latitude de 200 ne vient pas d'un
 * GPS, elle vient d'un appel forgé ou d'un défaut. La ramener à 90 rangerait
 * quelqu'un au pôle Nord et lui donnerait une météo — un refus net est plus
 * facile à voir et à comprendre.
 */
export function coarseLocation(
  latitude: unknown,
  longitude: unknown
): CoarseLocation | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < LATITUDE.min || latitude > LATITUDE.max) return null;
  if (longitude < LONGITUDE.min || longitude > LONGITUDE.max) return null;

  const facteur = 10 ** COORDINATE_DECIMALS;
  return {
    latitude: Math.round(latitude * facteur) / facteur,
    longitude: Math.round(longitude * facteur) / facteur,
  };
}
