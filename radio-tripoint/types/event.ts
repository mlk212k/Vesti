import type { Demo, Visuel } from "./media"

export interface Evenement extends Demo {
  slug: string
  titre: string
  description: string
  /** ISO 8601 avec fuseau. */
  debut: string
  fin?: string
  lieu: string
  ville: string
  pays: "FR" | "LU" | "DE"
  adresse?: string
  gratuit?: boolean
  lienExterne?: string
  organisateur?: string
  visuel?: Visuel
}
