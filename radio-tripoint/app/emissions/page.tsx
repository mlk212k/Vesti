import { PageHero } from "@/components/ui/PageHero"
import { ShowCard } from "@/components/shows/ShowCard"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { listerEmissions } from "@/lib/contenu/emissions"
import { metadataPage } from "@/lib/seo/metadata"
import Link from "next/link"

export const metadata = metadataPage({
  titre: "Nos émissions — les rendez-vous de Radio Tripoint",
  description:
    "Génération Z, On Vous Donne la Parole, Histoire & Mémoire Régionale, Talents du coin !… Découvrez les émissions de Radio Tripoint, la radio des Trois Frontières.",
  chemin: "/emissions",
})

export default async function PageEmissions() {
  const emissions = await listerEmissions()
  const grilleConnue = emissions.some((e) => e.creneaux.length > 0)
  return (
    <>
      <PageHero
        miettes={[{ nom: "Émissions", chemin: "/emissions" }]}
        surtitre="À l'antenne"
        titre="Nos émissions"
        intro="Des voix d'ici, des sujets d'ici. Jeunesse, mémoire, bien-être, talents locaux et parole aux auditeurs : les rendez-vous qui font Radio Tripoint."
        enfants={
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <BoutonDirect taille="grand" />
            <Link href="/podcasts" className="btn btn-trait min-h-14 !px-6">
              Écouter les replays
            </Link>
          </div>
        }
      />
      <section aria-label="Liste des émissions" className="conteneur py-12 lg:py-16">
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {emissions.map((e) => (
            <li key={e.slug}>
              <ShowCard emission={e} titreNiveau="h2" />
            </li>
          ))}
        </ul>
        {!grilleConnue && (
          <p className="text-encre-3 mt-10 max-w-2xl text-sm">
            La grille horaire détaillée sera publiée ici prochainement. Pour savoir ce qui passe à
            l&apos;antenne, lancez le direct.
          </p>
        )}
      </section>
    </>
  )
}
