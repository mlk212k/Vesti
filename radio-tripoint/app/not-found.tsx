import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { Tripoint } from "@/components/marque/Tripoint"
import { BoutonDirect } from "@/components/radio/BoutonDirect"

export const metadata = { title: "Page introuvable" }

/** 404 : on a perdu la fréquence — mais le direct, lui, est toujours là. */
export default function NotFound() {
  return (
    <section className="bg-nuit text-nuit-encre relative isolate overflow-hidden">
      <Tripoint
        className="text-nuit-trait pointer-events-none absolute top-1/2 left-[70%] -z-10 h-[150%] w-auto -translate-x-1/2 -translate-y-1/2"
        epaisseur={1}
      />
      <div className="conteneur py-20 lg:py-32">
        <p className="surtitre text-nuit-encre-2 flex items-center gap-3">
          <span className="bg-nuit-accent h-px w-8" aria-hidden />
          Erreur 404 · Hors fréquence
        </p>
        <h1 className="titre-affiche mt-5 max-w-4xl text-[clamp(2.6rem,1.2rem+6vw,6.4rem)]">
          Cette page s&apos;est perdue{" "}
          <span className="text-nuit-accent">entre deux frontières.</span>
        </h1>
        <p className="presse text-nuit-encre-2 mt-6 max-w-xl text-[1.3rem] leading-snug">
          Le lien est peut-être ancien, ou la page a changé d&apos;adresse avec la nouvelle version
          du site. Le direct, lui, n&apos;a pas bougé.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <BoutonDirect taille="grand" />
          <Link href="/" className="btn btn-nuit min-h-14 !px-6">
            Retour à l&apos;accueil
          </Link>
        </div>
        <nav aria-label="Pages utiles" className="border-nuit-trait mt-16 border-t pt-6">
          <ul className="flex flex-wrap gap-x-8 gap-y-3">
            {[
              ["Actualités", "/actualites"],
              ["Émissions", "/emissions"],
              ["Podcasts", "/podcasts"],
              ["Agenda", "/agenda"],
              ["Contact", "/contact"],
            ].map(([l, h]) => (
              <li key={h}>
                <Link href={h} className="lien-fleche text-nuit-encre hover:text-nuit-accent">
                  {l} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  )
}
