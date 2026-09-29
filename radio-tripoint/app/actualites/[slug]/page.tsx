import { ArrowRight, Clock, MapPin } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { BlocsArticle } from "@/components/news/BlocsArticle"
import { NewsCard } from "@/components/news/NewsCard"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { Breadcrumbs } from "@/components/ui/Breadcrumbs"
import { JsonLd } from "@/components/ui/JsonLd"
import { ShareButtons } from "@/components/ui/ShareButtons"
import { Visuel } from "@/components/ui/Visuel"
import { categories } from "@/data/categories"
import {
  articleParSlug,
  articlesRecents,
  articlesSimilaires,
  slugsArticles,
} from "@/lib/contenu/articles"
import { teinteCategorie } from "@/lib/contenu/teintes"
import { jsonLdArticle } from "@/lib/seo/jsonld"
import { metadataPage, urlAbsolue } from "@/lib/seo/metadata"
import { dateLongue, heure } from "@/lib/utils/dates"
import { tempsLecture } from "@/lib/utils/texte"

export async function generateStaticParams() {
  return (await slugsArticles()).map((slug) => ({ slug }))
}

export async function generateMetadata(props: PageProps<"/actualites/[slug]">) {
  const { slug } = await props.params
  const a = await articleParSlug(slug)
  if (!a) return { title: "Article introuvable" }
  return metadataPage({
    titre: a.titre,
    description: a.chapeau,
    chemin: `/actualites/${a.slug}`,
    type: "article",
    publieLe: a.publieLe,
    modifieLe: a.modifieLe,
    section: categories[a.categorie].nom,
    image: a.visuel
      ? {
          src: a.visuel.src,
          alt: a.visuel.alt,
          largeur: a.visuel.largeur,
          hauteur: a.visuel.hauteur,
        }
      : undefined,
    motsCles: [...(a.lieux ?? []), ...(a.tags ?? []), categories[a.categorie].nom],
    noindex: a.demo,
  })
}

export default async function PageArticle(props: PageProps<"/actualites/[slug]">) {
  const { slug } = await props.params
  const a = await articleParSlug(slug)
  if (!a) notFound()
  const cat = categories[a.categorie]
  const [similaires, recents] = await Promise.all([
    articlesSimilaires(a, 3),
    articlesRecents(5, a.slug),
  ])
  const url = urlAbsolue(`/actualites/${a.slug}`)

  return (
    <article>
      <JsonLd data={jsonLdArticle(a)} />
      <header className="conteneur pt-6 sm:pt-8">
        <Breadcrumbs
          elements={[
            { nom: cat.nom, chemin: cat.chemin },
            { nom: a.titre, chemin: `/actualites/${a.slug}` },
          ]}
        />
        <div className="mx-auto mt-10 max-w-3xl sm:mt-14">
          <p className="flex flex-wrap items-center gap-3">
            <Link href={cat.chemin} className="badge hover:underline">
              {cat.nom}
            </Link>
            {a.demo && <span className="badge-exemple">Exemple</span>}
          </p>
          <h1 className="titre-affiche mt-4 text-[clamp(2.1rem,1.2rem+3.6vw,4rem)] !leading-[1.02]">
            {a.titre}
          </h1>
          <p className="presse text-encre-2 mt-6 text-[1.3rem] leading-snug sm:text-[1.45rem]">
            {a.chapeau}
          </p>
          <div className="border-trait text-encre-3 mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-y py-4 text-sm">
            <span className="text-encre font-semibold">
              {a.auteur ?? "La rédaction de Radio Tripoint"}
            </span>
            <time dateTime={a.publieLe}>
              {dateLongue(a.publieLe)} à {heure(a.publieLe)}
            </time>
            {a.modifieLe && <span>Mis à jour le {dateLongue(a.modifieLe)}</span>}
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" aria-hidden /> {tempsLecture(a.corps)} min de lecture
            </span>
            {a.lieux && a.lieux.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" aria-hidden /> {a.lieux.join(", ")}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="conteneur mt-10">
        <figure className="mx-auto max-w-5xl">
          <Visuel
            visuel={a.visuel}
            repli={{
              mot: cat.nom,
              surmot: "Radio Tripoint",
              teinte: teinteCategorie[a.categorie],
              taille: "grand",
            }}
            ratio="aspect-[16/9]"
            sizes="(min-width: 1024px) 1024px, 100vw"
            preload
          />
          {a.visuel?.credit && (
            <figcaption className="text-encre-3 mt-2 text-xs">© {a.visuel.credit}</figcaption>
          )}
        </figure>
      </div>

      <div className="conteneur mt-12 grid gap-14 lg:grid-cols-[minmax(0,1fr)_19rem] xl:gap-20">
        <div className="mx-auto w-full max-w-[45rem]">
          <BlocsArticle blocs={a.corps} />
          <div className="border-trait mt-12 border-t pt-6">
            <ShareButtons url={url} titre={a.titre} />
          </div>
          <aside className="bg-nuit text-nuit-encre mt-10 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <p className="titre-carte text-lg">
              L&apos;info du territoire, aussi à l&apos;antenne.
            </p>
            <BoutonDirect className="self-start sm:self-auto" />
          </aside>
        </div>
        <aside aria-labelledby="titre-dernieres" className="lg:pt-2">
          <div className="lg:sticky lg:top-24">
            <h2 id="titre-dernieres" className="surtitre border-trait-fort border-t-2 pt-3">
              Les dernières actualités
            </h2>
            <ol className="divide-trait mt-5 divide-y">
              {recents.slice(0, 5).map((r, i) => (
                <li key={r.slug} className="carte group flex gap-4 py-4 first:pt-0">
                  <span className="titre-affiche text-accent-encre w-6 flex-none text-[1.6rem] tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="badge">{categories[r.categorie].court}</p>
                    <h3 className="carte-titre titre-carte mt-1 text-[1rem]">
                      <Link href={`/actualites/${r.slug}`} className="carte-lien">
                        {r.titre}
                      </Link>
                    </h3>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>

      {similaires.length > 0 && (
        <section
          aria-labelledby="titre-lire-aussi"
          className="conteneur border-trait-fort mt-20 border-t-2 pt-4 lg:mt-28"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="titre-lire-aussi" className="titre-section">
              À lire aussi
            </h2>
            <Link href={cat.chemin} className="lien-fleche hover:text-accent-encre">
              Toute la rubrique {cat.nom} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {similaires.map((s) => (
              <li key={s.slug}>
                <NewsCard article={s} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="h-20" />
    </article>
  )
}
