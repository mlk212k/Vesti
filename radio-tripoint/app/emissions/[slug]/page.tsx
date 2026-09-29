import { ArrowRight, CalendarClock, Clock } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { IconeReseau } from "@/components/marque/IconesReseaux"
import { Tripoint } from "@/components/marque/Tripoint"
import { NewsCard } from "@/components/news/NewsCard"
import { PodcastCard } from "@/components/podcasts/PodcastCard"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { ShowCard } from "@/components/shows/ShowCard"
import { Breadcrumbs } from "@/components/ui/Breadcrumbs"
import { Couverture } from "@/components/ui/Couverture"
import { EtatVide } from "@/components/ui/EtatVide"
import { JsonLd } from "@/components/ui/JsonLd"
import { emissions as emissionsDeclarees } from "@/data/shows"
import { listerArticles } from "@/lib/contenu/articles"
import { emissionParSlug, listerEmissions } from "@/lib/contenu/emissions"
import { listerEpisodes } from "@/lib/contenu/podcasts"
import { libelleCreneaux, libelleHeure, programmeSuivant } from "@/lib/radio/grille"
import { radioConfig } from "@/config/radioConfig"
import { jsonLdEmission } from "@/lib/seo/jsonld"
import { metadataPage } from "@/lib/seo/metadata"
import Image from "next/image"

export function generateStaticParams() {
  return emissionsDeclarees.map((e) => ({ slug: e.slug }))
}

export async function generateMetadata(props: PageProps<"/emissions/[slug]">) {
  const { slug } = await props.params
  const e = await emissionParSlug(slug)
  if (!e) return { title: "Émission introuvable" }
  return metadataPage({
    titre: `${e.nom} — émission de Radio Tripoint`,
    description: e.accroche
      ? `${e.nom} : ${e.accroche} Une émission à écouter sur Radio Tripoint, la radio des Trois Frontières.`
      : `${e.nom}, une émission de Radio Tripoint (${e.thematique.toLowerCase()}), à écouter en direct et en replay.`,
    chemin: `/emissions/${e.slug}`,
    image: e.visuel ? { src: e.visuel.src, alt: e.visuel.alt } : undefined,
  })
}

export default async function PageEmission(props: PageProps<"/emissions/[slug]">) {
  const { slug } = await props.params
  const e = await emissionParSlug(slug)
  if (!e) notFound()
  const [episodes, toutes, articles] = await Promise.all([
    listerEpisodes({ emission: e.slug }),
    listerEmissions(),
    e.categorie ? listerArticles({ categorie: e.categorie, parPage: 3 }) : Promise.resolve(null),
  ])
  const horaires = libelleCreneaux(e.creneaux)
  // « Prochain épisode » calculé au rendu (page régénérée toutes les 10 min).
  const prochain = e.creneaux.length
    ? programmeSuivant([e], new Date(), radioConfig.timeZone)
    : null
  const autres = toutes.filter((x) => x.slug !== e.slug).slice(0, 3)
  const reseaux = Object.entries(e.reseaux ?? {}).filter(([, url]) => url) as [
    keyof NonNullable<typeof e.reseaux>,
    string,
  ][]

  return (
    <>
      <JsonLd data={jsonLdEmission(e)} />
      <header className="bg-nuit text-nuit-encre relative isolate overflow-hidden">
        <div className="conteneur pt-6 sm:pt-8">
          <Breadcrumbs
            sombre
            elements={[
              { nom: "Émissions", chemin: "/emissions" },
              { nom: e.nom, chemin: `/emissions/${e.slug}` },
            ]}
          />
        </div>
        <div className="conteneur grid gap-10 pt-10 pb-14 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:pt-14 lg:pb-20">
          <div className="entree">
            <p className="surtitre text-nuit-accent">{e.thematique}</p>
            <h1 className="titre-affiche mt-4 text-[clamp(2.6rem,1.2rem+6vw,6rem)]">{e.nom}</h1>
            {e.accroche && (
              <p className="presse text-nuit-encre-2 mt-5 max-w-xl text-[1.35rem] leading-snug sm:text-[1.55rem]">
                {e.accroche}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <BoutonDirect taille="grand" />
              {episodes.length > 0 && (
                <a href="#episodes" className="btn btn-nuit min-h-14 !px-6">
                  Derniers épisodes
                </a>
              )}
            </div>
          </div>
          <div className="entree-2 relative aspect-square w-full max-w-md justify-self-end overflow-hidden lg:max-w-none">
            {e.visuel ? (
              <Image
                src={e.visuel.src}
                alt={e.visuel.alt}
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                preload
                className="object-cover"
              />
            ) : (
              <Couverture mot={e.nom} surmot="Radio Tripoint" teinte={e.teinte} taille="grand" />
            )}
          </div>
        </div>
        <Tripoint
          className="text-nuit-trait pointer-events-none absolute -top-40 -left-40 -z-10 size-[40rem]"
          epaisseur={1}
          point={false}
        />
      </header>

      <div className="conteneur grid gap-14 py-14 lg:grid-cols-[2fr_1fr] lg:py-20">
        <section aria-labelledby="titre-presentation">
          <h2 id="titre-presentation" className="surtitre border-trait-fort border-t-2 pt-3">
            Présentation
          </h2>
          {e.presentation ? (
            <div className="prose-article mt-6">
              {e.presentation.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          ) : (
            <p className="presse text-encre-2 mt-6 text-[1.25rem] leading-snug">
              La présentation détaillée de <strong className="text-encre">{e.nom}</strong> sera
              publiée prochainement. En attendant, retrouvez l&apos;émission à l&apos;antenne de
              Radio Tripoint.
            </p>
          )}
          {e.animateurs && e.animateurs.length > 0 && (
            <p className="text-encre-2 mt-8">
              <span className="surtitre text-encre-3 mr-2">Au micro</span>
              {e.animateurs.join(", ")}
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          <section aria-labelledby="titre-quand" className="border-trait bg-surface border p-6">
            <h2 id="titre-quand" className="surtitre flex items-center gap-2">
              <Clock className="size-4" aria-hidden /> Quand écouter ?
            </h2>
            {horaires.length ? (
              <ul className="mt-4 space-y-1.5 font-semibold">
                {horaires.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            ) : (
              <p className="text-encre-2 mt-4">
                Horaires à venir. L&apos;émission est diffusée sur le direct de Radio Tripoint.
              </p>
            )}
          </section>
          {prochain && (
            <section
              aria-labelledby="titre-prochain"
              className="border-trait bg-surface border p-6"
            >
              <h2 id="titre-prochain" className="surtitre flex items-center gap-2">
                <CalendarClock className="size-4" aria-hidden /> Prochain rendez-vous
              </h2>
              <p className="titre-carte mt-3 text-xl capitalize">
                {prochain.creneau.jour} · {libelleHeure(prochain.creneau.debut)}
              </p>
            </section>
          )}
          {reseaux.length > 0 && (
            <section aria-labelledby="titre-reseaux" className="border-trait bg-surface border p-6">
              <h2 id="titre-reseaux" className="surtitre">
                Suivre l&apos;émission
              </h2>
              <ul className="mt-4 flex gap-2">
                {reseaux.map(([r, url]) => (
                  <li key={r}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener"
                      aria-label={r}
                      className="border-trait hover:border-encre grid size-11 place-items-center rounded-full border"
                    >
                      <IconeReseau reseau={r} />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>

      <section id="episodes" aria-labelledby="titre-episodes" className="conteneur scroll-mt-24">
        <div className="border-trait-fort border-t-2 pt-4">
          <h2 id="titre-episodes" className="titre-section">
            Derniers épisodes
          </h2>
        </div>
        {episodes.length ? (
          <ul className="divide-trait border-trait mt-6 divide-y border-b">
            {episodes.slice(0, 8).map((ep) => (
              <li key={ep.slug}>
                <PodcastCard episode={ep} emissionNom={e.nom} />
              </li>
            ))}
          </ul>
        ) : (
          <EtatVide
            className="mt-8"
            titre="Les replays de cette émission arrivent bientôt."
            actions={<BoutonDirect />}
          >
            Les épisodes de {e.nom} seront disponibles ici en podcast après leur diffusion.
          </EtatVide>
        )}
      </section>

      {articles && articles.elements.length > 0 && (
        <section aria-labelledby="titre-articles" className="conteneur mt-20">
          <div className="border-trait-fort border-t-2 pt-4">
            <h2 id="titre-articles" className="titre-section">
              Articles associés
            </h2>
          </div>
          <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {articles.elements.map((a) => (
              <li key={a.slug}>
                <NewsCard article={a} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="titre-autres" className="conteneur mt-20 pb-20">
        <div className="border-trait-fort flex flex-wrap items-end justify-between gap-4 border-t-2 pt-4">
          <h2 id="titre-autres" className="titre-section">
            Autres émissions
          </h2>
          <Link href="/emissions" className="lien-fleche hover:text-accent-encre">
            Toutes les émissions <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {autres.map((x) => (
            <li key={x.slug}>
              <ShowCard emission={x} />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export const revalidate = 600
