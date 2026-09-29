import { ArrowRight, Mic } from "lucide-react"
import Link from "next/link"
import { Hero } from "@/components/accueil/Hero"
import { Newsletter } from "@/components/accueil/Newsletter"
import { Professionnels } from "@/components/accueil/Professionnels"
import { EventCard } from "@/components/events/EventCard"
import { FeaturedArticle } from "@/components/news/FeaturedArticle"
import { NewsCardLigne } from "@/components/news/NewsCard"
import { NewsGrid } from "@/components/news/NewsGrid"
import { PodcastCard } from "@/components/podcasts/PodcastCard"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { ShowCard } from "@/components/shows/ShowCard"
import { SectionTerritoire } from "@/components/territoire/SectionTerritoire"
import { EnTeteSection } from "@/components/ui/EnTeteSection"
import { EtatVide } from "@/components/ui/EtatVide"
import { une } from "@/lib/contenu/articles"
import { listerEmissions } from "@/lib/contenu/emissions"
import { listerEvenements } from "@/lib/contenu/evenements"
import { listerEpisodes } from "@/lib/contenu/podcasts"
import { versGrille } from "@/lib/radio/types"
import { metadataPage } from "@/lib/seo/metadata"

export const metadata = metadataPage({
  titre: "Radio Tripoint — Radio transfrontalière France, Luxembourg, Allemagne",
  absolu: true,
  description:
    "Écoutez Radio Tripoint en direct depuis Sierck-les-Bains : actualités des Trois Frontières, émissions, podcasts et agenda entre Moselle, Luxembourg et Sarre.",
  chemin: "/",
})

// Agenda et « à la une » dépendent de la date : régénération horaire.
export const revalidate = 3600

export default async function Accueil() {
  const [{ principal, secondaires, suite }, emissions, episodes, evenements] = await Promise.all([
    une(),
    listerEmissions(),
    listerEpisodes(),
    listerEvenements(),
  ])
  const nomEmission = new Map(emissions.map((e) => [e.slug, e.nom]))

  return (
    <>
      <Hero grille={versGrille(emissions)} />

      {/* ─── À la une ─── */}
      <section aria-labelledby="titre-une" className="conteneur pt-14 lg:pt-20">
        <EnTeteSection
          id="titre-une"
          surtitre="L'info du territoire"
          titre="À la une"
          lien={{ href: "/actualites", libelle: "Toutes les actualités" }}
        />
        {principal ? (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.55fr_1fr] lg:gap-12">
            <FeaturedArticle article={principal} preload />
            {secondaires.length > 0 && (
              <ul className="divide-trait lg:border-trait flex flex-col divide-y lg:border-l lg:pl-10">
                {secondaires.map((a) => (
                  <li key={a.slug} className="py-6 first:pt-0 last:pb-0">
                    <NewsCardLigne article={a} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <EtatVide
            className="mt-8"
            titre="La rédaction prépare ses premiers articles."
            actions={
              <>
                <BoutonDirect />
                <Link href="/soumettre-une-information" className="btn btn-trait">
                  Proposer une information
                </Link>
              </>
            }
          >
            En attendant, l&apos;actualité des Trois Frontières se vit à l&apos;antenne. Une info à
            partager ? Écrivez à la rédaction.
          </EtatVide>
        )}
      </section>

      {/* ─── Dernières actualités ─── */}
      {suite.length > 0 && (
        <section aria-labelledby="titre-dernieres" className="conteneur pt-16 lg:pt-24">
          <EnTeteSection
            id="titre-dernieres"
            surtitre="En continu"
            titre="Les dernières actualités"
            lien={{ href: "/actualites", libelle: "Voir tout" }}
          />
          <div className="mt-8">
            <NewsGrid articles={suite} />
          </div>
        </section>
      )}

      {/* ─── Émissions ─── */}
      <section aria-labelledby="titre-emissions" className="pt-16 lg:pt-24">
        <div className="conteneur">
          <EnTeteSection
            id="titre-emissions"
            surtitre="À l'antenne"
            titre="Nos émissions"
            lien={{ href: "/emissions", libelle: "Toutes les émissions" }}
          />
        </div>
        <ul className="rail conteneur mt-8 !gap-4 pb-2 sm:!grid sm:grid-cols-2 sm:!overflow-visible lg:grid-cols-3">
          {emissions.map((e) => (
            <li key={e.slug} className="xs:w-[70%] w-[82%] flex-none sm:w-auto">
              <ShowCard emission={e} />
            </li>
          ))}
        </ul>
      </section>

      {/* ─── Podcasts ─── */}
      <section aria-labelledby="titre-podcasts" className="conteneur pt-16 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-14">
          <div>
            <EnTeteSection id="titre-podcasts" surtitre="Replays" titre="Podcasts & replays" />
            <p className="presse text-encre-2 mt-4 text-lg leading-snug">
              Une émission manquée ? Retrouvez-la ici et écoutez-la quand vous voulez, sans quitter
              la page.
            </p>
            <Link href="/podcasts" className="lien-fleche hover:text-accent-encre mt-6">
              Tous les épisodes <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          {episodes.length > 0 ? (
            <ul className="divide-trait border-trait divide-y border-y">
              {episodes.slice(0, 4).map((ep) => (
                <li key={ep.slug}>
                  <PodcastCard
                    episode={ep}
                    emissionNom={ep.emission ? nomEmission.get(ep.emission) : undefined}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EtatVide titre="Les premiers replays arrivent bientôt." actions={<BoutonDirect />}>
              Les émissions de Radio Tripoint seront disponibles en podcast sur cette page.
              D&apos;ici là, écoutez-les en direct.
            </EtatVide>
          )}
        </div>
      </section>

      <div className="pt-16 lg:pt-24">
        <SectionTerritoire />
      </div>

      {/* ─── Agenda ─── */}
      <section aria-labelledby="titre-agenda" className="conteneur pt-16 lg:pt-24">
        <EnTeteSection
          id="titre-agenda"
          surtitre="Sortir"
          titre="L'agenda des Trois Frontières"
          lien={{ href: "/agenda", libelle: "Tout l'agenda" }}
        />
        {evenements.length > 0 ? (
          <ul className="mt-8 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {evenements.slice(0, 4).map((e) => (
              <li key={e.slug}>
                <EventCard evenement={e} />
              </li>
            ))}
          </ul>
        ) : (
          <EtatVide
            className="mt-8"
            titre="Aucun événement annoncé pour le moment."
            actions={
              <Link href="/soumettre-une-information" className="btn btn-plein">
                <Mic className="size-4" aria-hidden /> Annoncer un événement
              </Link>
            }
          >
            Vous organisez un concert, une fête de village, une exposition ou un match ? Faites-le
            savoir : Radio Tripoint relaie les rendez-vous du territoire.
          </EtatVide>
        )}
      </section>

      <Professionnels />
      <Newsletter />
    </>
  )
}
