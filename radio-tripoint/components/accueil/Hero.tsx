import { ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { site } from "@/config/site"
import { Tripoint } from "@/components/marque/Tripoint"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { EnCeMoment } from "@/components/radio/EnCeMoment"
import type { GrilleClient } from "@/lib/radio/types"

/**
 * Le studio : fond nuit, grand titre, module du direct. Pas de hauteur
 * plein écran vide — le direct est visible sans défiler, même sur 320 px.
 */
export function Hero({ grille }: { grille: GrilleClient }) {
  return (
    <section
      aria-labelledby="titre-accueil"
      className="bg-nuit text-nuit-encre relative isolate overflow-hidden"
    >
      {site.visuels.hero ? (
        <>
          <Image
            src={site.visuels.hero}
            alt=""
            fill
            preload
            sizes="100vw"
            className="-z-20 object-cover"
          />
          <div className="from-nuit via-nuit/85 to-nuit/40 absolute inset-0 -z-10 bg-gradient-to-r" />
        </>
      ) : (
        <Tripoint
          className="text-nuit-trait pointer-events-none absolute top-1/2 left-[88%] -z-10 h-[150%] w-auto -translate-x-1/2 -translate-y-1/2 lg:left-[46%]"
          epaisseur={1}
        />
      )}

      <div className="conteneur grid gap-10 pt-10 pb-12 sm:pt-14 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:gap-14 lg:pt-20 lg:pb-20">
        {/* Pas d'animation ici : le titre est l'élément LCP de la page. */}
        <div>
          <p className="surtitre text-nuit-encre-2 flex items-center gap-3">
            <span className="bg-nuit-accent h-px w-8" aria-hidden />
            La radio transfrontalière<span className="hidden sm:inline"> · Sierck-les-Bains</span>
          </p>
          <h1
            id="titre-accueil"
            className="titre-affiche mt-5 text-[clamp(2.6rem,1.2rem+6.4vw,6.4rem)]"
          >
            La radio qui fait vibrer <span className="text-nuit-accent">les Trois Frontières.</span>
          </h1>
          <p className="text-nuit-encre-2 mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.95rem] font-semibold tracking-[0.02em] sm:text-base">
            <span>France</span>
            <span className="text-nuit-accent" aria-hidden>
              ·
            </span>
            <span>Luxembourg</span>
            <span className="text-nuit-accent" aria-hidden>
              ·
            </span>
            <span>Allemagne</span>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <BoutonDirect taille="grand" />
            <Link href="/emissions" className="btn btn-nuit min-h-14 !px-6">
              Découvrir nos émissions <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="entree-2">
          <EnCeMoment grille={grille} />
        </div>
      </div>
    </section>
  )
}
