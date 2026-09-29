"use client"

import { useSyncExternalStore } from "react"

/**
 * Heure courante, rafraîchie chaque minute. Côté serveur : null — la grille
 * est donc calculée après hydratation, sans décalage de rendu.
 */
let maintenant = 0
const abonnes = new Set<() => void>()
let minuterie: ReturnType<typeof setInterval> | null = null

function abonner(f: () => void) {
  abonnes.add(f)
  if (!minuterie) {
    maintenant = Date.now()
    minuterie = setInterval(() => {
      maintenant = Date.now()
      abonnes.forEach((g) => g())
    }, 30_000)
  }
  return () => {
    abonnes.delete(f)
    if (abonnes.size === 0 && minuterie) {
      clearInterval(minuterie)
      minuterie = null
    }
  }
}

export function useMaintenant(): number | null {
  return useSyncExternalStore(
    abonner,
    () => {
      if (!maintenant) maintenant = Date.now()
      return maintenant
    },
    () => null,
  )
}
