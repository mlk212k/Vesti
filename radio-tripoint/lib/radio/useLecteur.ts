"use client"

import { useEffect, useSyncExternalStore } from "react"
import { abonner, lire, lireServeur, suivreTitre, type EtatLecteur } from "./moteur"

export function useLecteur(): EtatLecteur {
  return useSyncExternalStore(abonner, lire, lireServeur)
}

/** Active le suivi du titre en cours tant que le composant est monté. */
export function useSuiviTitre() {
  useEffect(() => suivreTitre(), [])
}
