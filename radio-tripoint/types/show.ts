import type { CategorieSlug } from "./category"
import type { Demo, Visuel } from "./media"

export type Jour = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche"

/** Créneau hebdomadaire. Heures au format "HH:MM", fuseau Europe/Paris. */
export interface Creneau {
  jour: Jour
  debut: string
  fin: string
}

export interface Emission extends Demo {
  slug: string
  nom: string
  /** Promesse en une ligne. Null si l'émission ne l'a pas publiée. */
  accroche: string | null
  /** Présentation longue. Null tant qu'elle n'est pas fournie. */
  presentation: string | null
  /** Thématique affichée sur la carte. */
  thematique: string
  categorie?: CategorieSlug
  /**
   * Grille. Vide tant que les horaires officiels ne sont pas connus :
   * on affiche alors « horaires à venir », jamais une heure inventée.
   */
  creneaux: Creneau[]
  animateurs?: string[]
  visuel?: Visuel
  reseaux?: Partial<Record<"facebook" | "instagram" | "youtube" | "tiktok", string>>
  /** Teinte de la couverture typographique quand il n'y a pas de visuel. */
  teinte: "encre" | "accent" | "sable" | "nuit"
}
