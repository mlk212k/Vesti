/**
 * Le vocabulaire du profil, à un seul endroit.
 *
 * ⚠️ Ces listes étaient écrites en dur dans le formulaire d'inscription. Elles
 * servent maintenant à DEUX écrans — l'inscription et les réglages — et une
 * copie qui dérive de l'autre est une panne silencieuse : ajouter une
 * morphologie d'un côté ferait afficher « Non renseignée » de l'autre pour les
 * gens qui l'ont choisie.
 *
 * Les valeurs doivent en plus rester alignées sur les contraintes CHECK des
 * migrations, sinon Postgres rejette l'écriture. C'est la vraie raison de les
 * garder groupées et commentées : elles ne sont pas libres.
 */

export const GENDERS = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "non-binaire", label: "Non-binaire" },
  { value: "non-precise", label: "Je préfère ne pas dire" },
] as const;

export const MORPHOLOGIES = [
  { value: "sablier", label: "Sablier" },
  { value: "triangle", label: "Triangle" },
  { value: "triangle-inverse", label: "Triangle inversé" },
  { value: "rectangle", label: "Rectangle" },
  { value: "ovale", label: "Ovale" },
  { value: "non-precise", label: "Je ne sais pas" },
] as const;

export const STYLES = [
  "Minimaliste",
  "Streetwear",
  "Classique",
  "Bohème",
  "Sportif",
  "Vintage",
  "Casual",
  "Chic",
] as const;

export type Gender = (typeof GENDERS)[number]["value"];
export type Morphology = (typeof MORPHOLOGIES)[number]["value"];

/** Bornes des mesures. Reprises des contraintes de la base, pas inventées. */
export const HEIGHT_CM = { min: 100, max: 250 } as const;
export const WEIGHT_KG = { min: 30, max: 300 } as const;

/** Nombre maximum de styles retenus — la colonne `style_prefs` est bornée. */
export const MAX_STYLES = 10;

/**
 * Lecture d'un nombre saisi à la main, avec ses bornes.
 *
 * Le champ vide est une réponse valable et vaut `null` : ces mesures sont
 * facultatives, et forcer quelqu'un à inventer son poids pour pouvoir
 * enregistrer son prénom serait absurde.
 */
export function parseMeasure(
  raw: string,
  bounds: { min: number; max: number },
  label: string
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (raw.trim() === "") return { ok: true, value: null };

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < bounds.min || parsed > bounds.max) {
    return {
      ok: false,
      message: `${label} doit être compris entre ${bounds.min} et ${bounds.max}.`,
    };
  }

  return { ok: true, value: Math.round(parsed) };
}
