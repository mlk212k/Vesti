"use client"

import Link from "next/link"
import { useEffect } from "react"

/** Erreur 500 d'une page : le reste du site (en-tête, lecteur) continue de fonctionner. */
export default function Erreur({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  useEffect(() => {
    // Seul l'identifiant technique est journalisé, jamais de donnée personnelle.
    console.error("Erreur de rendu", error.digest ?? "")
  }, [error])
  return (
    <section className="conteneur py-20 lg:py-28">
      <p className="surtitre text-accent-encre">Erreur · Friture sur la ligne</p>
      <h1 className="titre-page mt-4 max-w-3xl">Cette page n&apos;a pas pu s&apos;afficher.</h1>
      <p className="presse text-encre-2 mt-5 max-w-xl text-[1.25rem] leading-snug">
        Un problème technique de notre côté. Réessayez dans un instant — le lecteur en bas de page
        continue de fonctionner.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={() => retry()} className="btn btn-plein min-h-12 !px-6">
          Réessayer
        </button>
        <Link href="/" className="btn btn-trait min-h-12 !px-6">
          Accueil
        </Link>
      </div>
      {error.digest && <p className="text-encre-3 mt-10 text-xs">Référence : {error.digest}</p>}
    </section>
  )
}
