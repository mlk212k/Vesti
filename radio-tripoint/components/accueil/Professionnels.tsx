import { ArrowRight } from "lucide-react"
import Link from "next/link"

const offres = ["Publicité radio", "Campagnes locales", "Promotion web", "Événementiel"]

export function Professionnels() {
  return (
    <section aria-labelledby="titre-pro" className="conteneur py-16 lg:py-24">
      <div className="bg-accent text-sur-accent grid overflow-hidden lg:grid-cols-[1.4fr_1fr]">
        <div className="p-7 sm:p-10 lg:p-14">
          <p className="surtitre opacity-80">Pour les professionnels</p>
          <h2
            id="titre-pro"
            className="titre-affiche mt-4 text-[clamp(2.2rem,1.3rem+3.6vw,4.2rem)]"
          >
            Votre entreprise.
            <br />
            Notre antenne.
          </h2>
          <p className="presse mt-5 max-w-lg text-[1.2rem] leading-snug opacity-90">
            Faites entendre votre activité des deux côtés de la frontière : spots radio, campagnes
            locales, promotion web et opérations événementielles, conçus avec notre équipe.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/publicite"
              className="btn bg-sur-accent text-accent min-h-12 !px-6 hover:bg-white"
            >
              Découvrir nos solutions <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/publicite#demande"
              className="btn min-h-12 border-[1.5px] border-current !px-6 hover:bg-white/10"
            >
              Demander une offre
            </Link>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-px border-t border-white/25 bg-white/25 lg:grid-cols-1 lg:border-t-0 lg:border-l">
          {offres.map((o, i) => (
            <li key={o} className="bg-accent flex items-end p-5 sm:p-7">
              <span className="mr-3 text-sm tabular-nums opacity-85">0{i + 1}</span>
              <span className="titre-carte text-[1.1rem] sm:text-[1.25rem]">{o}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
