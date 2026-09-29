import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { PodcastCard } from "@/components/podcasts/PodcastCard"
import { BoutonEpisode } from "@/components/radio/BoutonEpisode"
import { Breadcrumbs } from "@/components/ui/Breadcrumbs"
import { JsonLd } from "@/components/ui/JsonLd"
import { ShareButtons } from "@/components/ui/ShareButtons"
import { Visuel } from "@/components/ui/Visuel"
import { emissionParSlug } from "@/lib/contenu/emissions"
import { episodeParSlug, listerEpisodes } from "@/lib/contenu/podcasts"
import { jsonLdEpisode } from "@/lib/seo/jsonld"
import { metadataPage, urlAbsolue } from "@/lib/seo/metadata"
import { dateLongue, duree } from "@/lib/utils/dates"

export async function generateStaticParams() {
  return (await listerEpisodes()).map((e) => ({ slug: e.slug }))
}

export async function generateMetadata(props: PageProps<"/podcasts/[slug]">) {
  const { slug } = await props.params
  const ep = await episodeParSlug(slug)
  if (!ep) return { title: "Épisode introuvable" }
  return metadataPage({
    titre: ep.titre,
    description: ep.description,
    chemin: `/podcasts/${ep.slug}`,
    noindex: ep.demo,
  })
}

export default async function PageEpisode(props: PageProps<"/podcasts/[slug]">) {
  const { slug } = await props.params
  const ep = await episodeParSlug(slug)
  if (!ep) notFound()
  const emission = ep.emission ? await emissionParSlug(ep.emission) : null
  const autres = (
    await listerEpisodes(emission ? { emission: emission.slug } : { theme: ep.theme })
  )
    .filter((x) => x.slug !== ep.slug)
    .slice(0, 5)

  return (
    <>
      <JsonLd data={jsonLdEpisode(ep, emission)} />
      <div className="conteneur pt-6 sm:pt-8">
        <Breadcrumbs
          elements={[
            { nom: "Podcasts", chemin: "/podcasts" },
            { nom: ep.titre, chemin: `/podcasts/${ep.slug}` },
          ]}
        />
      </div>
      <article className="conteneur grid gap-10 pt-10 pb-16 md:grid-cols-[minmax(0,22rem)_1fr] md:items-start lg:gap-16 lg:pt-14">
        <Visuel
          visuel={ep.visuel}
          repli={{
            mot: emission?.nom ?? "Replay",
            surmot: "Radio Tripoint",
            teinte: emission?.teinte ?? "nuit",
          }}
          ratio="aspect-square"
          sizes="(min-width: 768px) 352px, 100vw"
          preload
        />
        <div>
          <p className="flex flex-wrap items-center gap-3">
            {emission ? (
              <Link href={`/emissions/${emission.slug}`} className="badge hover:underline">
                {emission.nom}
              </Link>
            ) : (
              <span className="badge">Podcast</span>
            )}
            {ep.demo && <span className="badge-exemple">Exemple</span>}
          </p>
          <h1 className="titre-affiche mt-4 text-[clamp(2rem,1.2rem+3vw,3.6rem)] !leading-[1.02]">
            {ep.titre}
          </h1>
          <p className="text-encre-3 mt-4 text-sm">
            <time dateTime={ep.publieLe}>{dateLongue(ep.publieLe)}</time> · {duree(ep.duree)}
          </p>
          <div className="mt-8">
            <BoutonEpisode
              variante="grand"
              episode={{
                slug: ep.slug,
                titre: ep.titre,
                audioUrl: ep.audioUrl,
                sousTitre: emission?.nom,
                duree: ep.duree,
              }}
            />
          </div>
          <p className="presse text-encre-2 mt-8 max-w-2xl text-[1.2rem] leading-relaxed">
            {ep.description}
          </p>
          <div className="border-trait mt-10 border-t pt-6">
            <ShareButtons url={urlAbsolue(`/podcasts/${ep.slug}`)} titre={ep.titre} />
          </div>
        </div>
      </article>
      {autres.length > 0 && (
        <section aria-labelledby="titre-autres-ep" className="conteneur pb-20">
          <div className="border-trait-fort flex flex-wrap items-end justify-between gap-4 border-t-2 pt-4">
            <h2 id="titre-autres-ep" className="titre-section">
              {emission ? `Autres épisodes de ${emission.nom}` : "À écouter aussi"}
            </h2>
            <Link href="/podcasts" className="lien-fleche hover:text-accent-encre">
              Tous les podcasts <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="divide-trait border-trait mt-6 divide-y border-b">
            {autres.map((x) => (
              <li key={x.slug}>
                <PodcastCard episode={x} emissionNom={emission?.nom} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
