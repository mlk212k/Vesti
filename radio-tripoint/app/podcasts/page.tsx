import { Search } from "lucide-react"
import Link from "next/link"
import { PodcastCard } from "@/components/podcasts/PodcastCard"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { EtatVide } from "@/components/ui/EtatVide"
import { Filtres } from "@/components/ui/Filtres"
import { PageHero } from "@/components/ui/PageHero"
import { listerEmissions } from "@/lib/contenu/emissions"
import { listerEpisodes, themesPodcast } from "@/lib/contenu/podcasts"
import { metadataPage } from "@/lib/seo/metadata"

export const metadata = metadataPage({
  titre: "Podcasts & replays",
  description:
    "Réécoutez les émissions de Radio Tripoint en podcast : actualités, culture, musique, sport et émissions des Trois Frontières.",
  chemin: "/podcasts",
})

export default async function PagePodcasts(props: PageProps<"/podcasts">) {
  const sp = await props.searchParams
  const theme =
    typeof sp.theme === "string" && themesPodcast.some((t) => t.valeur === sp.theme)
      ? sp.theme
      : "toutes"
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : ""
  const [episodes, emissions, tous] = await Promise.all([
    listerEpisodes({ theme, q }),
    listerEmissions(),
    listerEpisodes(),
  ])
  const nom = new Map(emissions.map((e) => [e.slug, e.nom]))
  const href = (t: string) => {
    const p = new URLSearchParams()
    if (t !== "toutes") p.set("theme", t)
    if (q) p.set("q", q)
    const s = p.toString()
    return s ? `/podcasts?${s}` : "/podcasts"
  }

  return (
    <>
      <PageHero
        miettes={[{ nom: "Podcasts & replays", chemin: "/podcasts" }]}
        surtitre="À la demande"
        titre="Podcasts & replays"
        intro="Une émission manquée, un reportage à réécouter : tout Radio Tripoint, quand vous voulez. La lecture continue pendant que vous naviguez."
        enfants={
          tous.length > 0 && (
            <div className="mt-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <Filtres label="Thèmes" options={themesPodcast} actif={theme} href={href} />
              <form
                role="search"
                action="/podcasts"
                className="relative w-full flex-none sm:max-w-sm xl:w-72"
              >
                {theme !== "toutes" && <input type="hidden" name="theme" value={theme} />}
                <label htmlFor="q-podcasts" className="sr-only">
                  Rechercher un épisode
                </label>
                <Search
                  className="text-encre-3 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                  aria-hidden
                />
                <input
                  id="q-podcasts"
                  name="q"
                  type="search"
                  defaultValue={q}
                  placeholder="Rechercher un épisode…"
                  className="champ !min-h-11 pl-10"
                />
              </form>
            </div>
          )
        }
      />
      <section aria-label="Épisodes" className="conteneur py-12 lg:py-16">
        {tous.length === 0 ? (
          <EtatVide titre="Les premiers replays arrivent bientôt." actions={<BoutonDirect />}>
            Les émissions de Radio Tripoint seront publiées ici en podcast après leur diffusion.
            D&apos;ici là, rendez-vous sur le direct.
          </EtatVide>
        ) : episodes.length === 0 ? (
          <EtatVide
            titre="Aucun épisode ne correspond."
            actions={
              <Link href="/podcasts" className="btn btn-trait">
                Voir tous les épisodes
              </Link>
            }
          >
            Essayez un autre thème ou un autre mot-clé.
          </EtatVide>
        ) : (
          <>
            <p className="surtitre text-encre-3" role="status">
              {episodes.length} épisode{episodes.length > 1 ? "s" : ""}
            </p>
            <ul className="divide-trait border-trait mt-4 divide-y border-y">
              {episodes.map((ep) => (
                <li key={ep.slug}>
                  <PodcastCard
                    episode={ep}
                    emissionNom={ep.emission ? nom.get(ep.emission) : undefined}
                    titreNiveau="h2"
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </>
  )
}
