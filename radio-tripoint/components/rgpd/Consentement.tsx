"use client"

import Link from "next/link"
import Script from "next/script"
import { useSyncExternalStore } from "react"
import { analytics } from "@/config/analytics"

type Choix = "accepte" | "refuse" | null
const CLE = "rt:consentement"
const abonnes = new Set<() => void>()

function lire(): Choix {
  try {
    const v = localStorage.getItem(CLE)
    return v === "accepte" || v === "refuse" ? v : null
  } catch {
    return null
  }
}
function ecrire(c: Exclude<Choix, null>) {
  try {
    localStorage.setItem(CLE, c)
  } catch {
    /* stockage indisponible : le bandeau reviendra, sans conséquence */
  }
  abonnes.forEach((f) => f())
}
/** Rouvre le bandeau (lien « Gérer les cookies »). */
export function reinitialiserConsentement() {
  try {
    localStorage.removeItem(CLE)
  } catch {}
  abonnes.forEach((f) => f())
}

/**
 * Bandeau de consentement + chargement conditionnel de la mesure d'audience.
 * Ne rend rien tant qu'aucun outil n'est configuré dans config/analytics.ts.
 */
export function Consentement() {
  const choix = useSyncExternalStore(
    (f) => {
      abonnes.add(f)
      return () => abonnes.delete(f)
    },
    lire,
    () => "refuse" as Choix, // serveur : rien d'affiché, rien de chargé
  )
  if (!analytics.script) return null
  const charger = !analytics.exigeConsentement || choix === "accepte"
  return (
    <>
      {charger && <Script src={analytics.script} strategy="afterInteractive" />}
      {analytics.exigeConsentement && choix === null && (
        <div
          role="dialog"
          aria-label="Cookies"
          className="border-trait bg-surface shadow-2 fixed inset-x-3 bottom-[calc(var(--barre-lecteur)+0.75rem)] z-50 mx-auto max-w-xl border p-5"
        >
          <p className="text-encre-2 text-sm">
            Nous aimerions mesurer l&apos;audience du site ({analytics.nom}) pour l&apos;améliorer.
            Rien n&apos;est déposé sans votre accord.{" "}
            <Link href="/politique-confidentialite#cookies" className="lien">
              En savoir plus
            </Link>
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => ecrire("accepte")}
              className="btn btn-plein !min-h-10"
            >
              Accepter
            </button>
            <button
              type="button"
              onClick={() => ecrire("refuse")}
              className="btn btn-trait !min-h-10"
            >
              Refuser
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function BoutonGererCookies() {
  if (!analytics.script) return null
  return (
    <button type="button" onClick={reinitialiserConsentement} className="btn btn-trait mt-4">
      Modifier mes choix
    </button>
  )
}
