import type { Demo, Visuel } from "./media"

export type ThemePodcast = "actualites" | "culture" | "musique" | "sport" | "emissions"

export interface Episode extends Demo {
  slug: string
  titre: string
  description: string
  /** Slug de l'émission d'origine, si l'épisode en est un replay. */
  emission?: string
  theme: ThemePodcast
  publieLe: string
  /** Durée en secondes. */
  duree: number
  /** URL du fichier audio (MP3/AAC). */
  audioUrl: string
  visuel?: Visuel
}
