import { z } from "zod"

// Pas de compilation JIT : Zod testerait sinon `new Function`, ce que la
// CSP du site (sans 'unsafe-eval') refuse et signale dans la console.
z.config({ jitless: true })

/** Nettoyage : trim, suppression des caractères de contrôle, espaces normalisés. */
const texte = (max: number, manquant = "Ce champ est invalide.") =>
  z
    .string({ error: manquant })
    .transform((s) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().max(max, `${max} caractères maximum.`))

const requis = (max: number, message: string) =>
  texte(max, message).pipe(z.string().min(1, message))

const email = texte(200, "Indiquez votre adresse e-mail.").pipe(z.email("Adresse e-mail invalide."))
const telephone = texte(30)
  .refine((s) => s === "" || /^[+()\d\s.-]{6,30}$/.test(s), "Numéro de téléphone invalide.")
  .optional()
const consentement = z.literal("oui", {
  error: "Votre accord est nécessaire pour que nous puissions vous répondre.",
})

export const categoriesInfo = [
  "Actualité locale",
  "Culture",
  "Musique",
  "Sport",
  "Événement",
  "Prévention",
  "Autre",
] as const
export const besoinsPub = [
  "Publicité radio",
  "Campagne locale",
  "Promotion web",
  "Campagne événementielle",
  "Visibilité digitale",
  "Partenariat",
  "Autre",
] as const

export const schemas = {
  contact: z.object({
    nom: requis(100, "Indiquez votre nom."),
    email,
    telephone,
    sujet: texte(150).optional(),
    message: requis(5000, "Écrivez votre message.").pipe(
      z.string().min(10, "Votre message est un peu court."),
    ),
    consentement,
  }),
  information: z.object({
    nom: requis(100, "Indiquez votre nom."),
    email,
    telephone,
    ville: requis(100, "Indiquez la ville concernée."),
    categorie: z.enum(categoriesInfo, { error: "Choisissez une catégorie." }),
    titre: requis(200, "Donnez un titre à votre information."),
    message: requis(8000, "Décrivez l'information.").pipe(
      z.string().min(20, "Donnez-nous un peu plus de détails."),
    ),
    consentement,
  }),
  publicite: z.object({
    nom: requis(100, "Indiquez votre nom."),
    entreprise: requis(150, "Indiquez votre entreprise ou structure."),
    email,
    telephone,
    besoin: z.enum(besoinsPub, { error: "Choisissez un besoin." }),
    message: texte(5000).optional(),
    consentement,
  }),
  newsletter: z.object({
    email,
    consentement,
  }),
} as const

export type TypeFormulaire = keyof typeof schemas
export const typesFormulaire = Object.keys(schemas) as TypeFormulaire[]

export const PIECE_JOINTE = {
  tailleMax: 5 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  libelle: "JPG, PNG, WebP ou PDF · 5 Mo maximum",
}

export const objetsMail: Record<TypeFormulaire, string> = {
  contact: "Contact depuis le site",
  information: "Information proposée à la rédaction",
  publicite: "Demande d'offre publicitaire",
  newsletter: "Inscription à la newsletter",
}
