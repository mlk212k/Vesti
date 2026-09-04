import { z } from "zod";
import { GENDERS, HEIGHT_CM, MAX_STYLES, MORPHOLOGIES, WEIGHT_KG } from "./profile";

/**
 * La frontière du profil : tout ce qui arrive du client est validé ici.
 *
 * ⚠️ Ce schéma vivait dans `app/(auth)/onboarding/actions.ts`. Il en a été sorti
 * parce qu'un second écran l'utilise maintenant — les réglages — et qu'un
 * fichier `"use server"` ne peut rien exporter d'autre que des fonctions
 * asynchrones : la seule alternative aurait été de le recopier. Deux validations
 * jumelles finissent toujours par diverger, et la divergence se découvre du côté
 * le moins regardé.
 *
 * Les bornes viennent de `lib/profile.ts`, qui les tient des contraintes CHECK
 * des migrations. Elles ne sont donc pas un choix de confort : une valeur hors
 * bornes n'est pas une donnée farfelue, c'est un rejet Postgres à l'écriture.
 */
export const profileSchema = z.object({
  // Le prénom sert à s'adresser à la personne. Borné à 40 caractères comme en
  // base, et vidé s'il ne contient que des espaces.
  first_name: z.string().trim().min(1).max(40).nullable(),
  gender: z.enum(GENDERS.map((g) => g.value) as [string, ...string[]]).nullable(),
  height_cm: z.number().int().min(HEIGHT_CM.min).max(HEIGHT_CM.max).nullable(),
  weight_kg: z.number().int().min(WEIGHT_KG.min).max(WEIGHT_KG.max).nullable(),
  morphology: z
    .enum(MORPHOLOGIES.map((m) => m.value) as [string, ...string[]])
    .nullable(),
  style_prefs: z.array(z.string().min(1).max(40)).max(MAX_STYLES),
});

export type ProfileInput = z.infer<typeof profileSchema>;
