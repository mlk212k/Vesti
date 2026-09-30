/**
 * Configuration du direct.
 *
 * Aucune URL n'est inventée : le flux et le player Radioking se renseignent
 * dans les variables d'environnement (voir `.env.example`). Tant qu'elles
 * sont vides, le player affiche un état « flux non configuré » propre au
 * lieu de planter ou de pointer vers une adresse fausse.
 */
import { socialLinks } from "./socialLinks"

export const radioConfig = {
  radioName: "Radio Tripoint",
  /** Flux audio direct (MP3/AAC). Vide = pas de lecture intégrée. */
  streamUrl: process.env.NEXT_PUBLIC_STREAM_URL ?? "",
  /** Page publique du player Radioking (bouton « Ouvrir le player »). */
  radiokingUrl: process.env.NEXT_PUBLIC_RADIOKING_URL ?? "",
  /** Route interne qui relaie le « titre en cours » (voir app/api/en-direct). */
  nowPlayingEndpoint: "/api/en-direct",
  /** Rafraîchissement du titre en cours, en millisecondes. */
  nowPlayingRefreshMs: 30_000,
  /** Fuseau de la grille des programmes. */
  timeZone: "Europe/Paris",
  socialLinks,
} as const

export const fluxConfigure = radioConfig.streamUrl.length > 0
