import { z } from "zod";

/**
 * Schéma de sortie de l'analyse de tenue.
 *
 * Deux principes tiennent tout le reste :
 *  - `brand` est nullable et toujours accompagné de `brand_confidence` : on ne
 *    peut pas afficher une marque comme un fait si elle n'a pas été lue sur la
 *    photo.
 *  - aucun champ « référence produit » : un modèle qui n'a pas vu le catalogue
 *    invente une référence plausible. Les liens produits viennent uniquement
 *    de la recherche web (lib/claude/find-products.ts).
 */

export const cropBoxSchema = z.object({
  /** Pourcentages de l'image d'origine, coin haut-gauche. */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(1).max(100),
  height: z.number().min(1).max(100),
});

export const garmentSchema = z.object({
  category: z.enum([
    "haut",
    "bas",
    "robe",
    "veste",
    "chaussures",
    "accessoire",
    "autre",
  ]),
  /** Nom court et parlant : « chemise en lin blanche ». */
  label: z.string().min(2).max(80),
  color: z.string().min(2).max(40),
  material: z.string().max(40).nullable(),
  pattern: z.string().max(40).nullable(),
  fit: z.string().max(40).nullable(),
  season: z.enum(["toutes", "ete", "hiver", "mi-saison"]),
  /** Renseignée UNIQUEMENT si un logo ou une étiquette est lisible. */
  brand: z.string().max(60).nullable(),
  brand_confidence: z.enum(["logo_visible", "suppose", "inconnue"]),
  crop_box: cropBoxSchema,
  confidence: z.number().int().min(0).max(100),
  /** Mots-clés destinés à la recherche web produit. */
  search_terms: z.array(z.string().min(2).max(60)).min(1).max(6),
});

export const outfitAnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.string().min(20).max(400),
  strengths: z.array(z.string().min(5).max(200)).min(1).max(4),
  improvements: z.array(z.string().min(5).max(200)).min(1).max(4),
  occasion: z.string().max(60),
  garments: z.array(garmentSchema).min(1).max(12),
});

export type CropBox = z.infer<typeof cropBoxSchema>;
export type Garment = z.infer<typeof garmentSchema>;
export type OutfitAnalysis = z.infer<typeof outfitAnalysisSchema>;

/**
 * Pièce repérée lors d'un scan de dressing. Identique à une pièce de tenue,
 * plus l'index de la photo d'où elle vient : sans lui, impossible de savoir
 * dans quelle image découper sa vignette.
 */
export const dressingGarmentSchema = garmentSchema.extend({
  source_index: z.number().int().min(0),
});

/** Tenue composée à partir des pièces déjà présentes dans le dressing. */
export const suggestedOutfitSchema = z.object({
  name: z.string().min(3).max(60),
  /** Index des pièces dans le tableau `garments` de la même réponse. */
  garment_indexes: z.array(z.number().int().min(0)).min(2).max(6),
  occasion: z.string().min(3).max(60),
  why: z.string().min(10).max(240),
});

/** Pièce manquante qui débloquerait plusieurs tenues. */
export const wardrobeGapSchema = z.object({
  item: z.string().min(3).max(80),
  why: z.string().min(10).max(240),
  priority: z.enum(["haute", "moyenne", "basse"]),
  /** Occasion que cette pièce débloquerait : travail, soirée, rendez-vous… */
  occasion: z.string().max(40).nullable(),
});

export const dressingAnalysisSchema = z.object({
  summary: z.string().min(20).max(400),
  garments: z.array(dressingGarmentSchema).min(1).max(40),
  outfits: z.array(suggestedOutfitSchema).max(6),
  gaps: z.array(wardrobeGapSchema).max(5),
});

export type DressingGarment = z.infer<typeof dressingGarmentSchema>;
export type SuggestedOutfit = z.infer<typeof suggestedOutfitSchema>;
export type WardrobeGap = z.infer<typeof wardrobeGapSchema>;
export type DressingAnalysis = z.infer<typeof dressingAnalysisSchema>;

/**
 * Tenue du jour composée avec la garde-robe existante.
 *
 * Les pièces sont désignées par leur identifiant en base, jamais par un nom
 * libre : c'est ce qui garantit que la tenue proposée existe réellement dans la
 * garde-robe et non dans l'imagination du modèle.
 */
export const dailyOutfitSchema = z.object({
  item_ids: z.array(z.string()).min(2).max(6),
  advice: z.string().min(20).max(400),
  /** Ce qu'il manque pour que la tenue tienne vraiment par ce temps. */
  missing: z.string().max(200).nullable(),
});

export type DailyOutfit = z.infer<typeof dailyOutfitSchema>;

/** Un produit réel, issu de la recherche web — jamais de la mémoire du modèle. */
export const productMatchSchema = z.object({
  title: z.string().min(2).max(160),
  merchant: z.string().max(80),
  url: z.string().url(),
  price: z.string().max(40).nullable(),
});

export const productMatchesSchema = z.object({
  matches: z.array(productMatchSchema).max(3),
});

export type ProductMatch = z.infer<typeof productMatchSchema>;
