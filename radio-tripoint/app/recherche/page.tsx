import { Search } from "lucide-react"
import Link from "next/link"
import { EtatVide } from "@/components/ui/EtatVide"
import { PageHero } from "@/components/ui/PageHero"
import { libellesTypes, rechercher, type TypeResultat } from "@/lib/contenu/recherche"
import { metadataPage } from "@/lib/seo/metadata"

export async function generateMetadata(props: PageProps<"/recherche">) {
  const { q } = await props.searchParams
  const terme = typeof q === "string" ? q.slice(0, 100) : ""
  return metadataPage({
    titre: terme ? `Recherche : ${terme}` : "Recherche",
    description:
      "Rechercher dans les articles, émissions, podcasts et événements de Radio Tripoint.",
    chemin: "/recherche",
    noindex: true,
  })
}

const ordre: TypeResultat[] = ["article", "emission", "podcast", "evenement"]

export default async function PageRecherche(props: PageProps<"/recherche">) {
  const { q } = await props.searchParams
  const terme = typeof q === "string" ? q.slice(0, 100).trim() : ""
  const resultats = terme ? await rechercher(terme) : []
  const groupes = ordre
    .map((t) => ({ type: t, liste: resultats.filter((r) => r.type === t) }))
    .filter((g) => g.liste.length)

  return (
    <>
      <PageHero
        miettes={[{ nom: "Recherche", chemin: "/recherche" }]}
        titre={terme ? <>« {terme} »</> : "Rechercher"}
        enfants={
          <form role="search" action="/recherche" className="relative mt-8 max-w-2xl">
            <label htmlFor="q-page" className="sr-only">
              Rechercher
            </label>
            <Search
              className="text-encre-3 pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2"
              aria-hidden
            />
            <input
              id="q-page"
              name="q"
              type="search"
              defaultValue={terme}
              placeholder="Article, émission, podcast, ville…"
              className="champ !min-h-14 pl-12 text-lg"
            />
          </form>
        }
      />
      <div className="conteneur py-12 lg:py-16">
        {!terme ? (
          <p className="text-encre-2">
            Saisissez un mot-clé : un nom de ville, d&apos;émission, un sujet.
          </p>
        ) : resultats.length === 0 ? (
          <EtatVide
            titre={`Aucun résultat pour « ${terme} ».`}
            actions={
              <>
                <Link href="/actualites" className="btn btn-trait">
                  Parcourir les actualités
                </Link>
                <Link href="/emissions" className="btn btn-trait">
                  Voir les émissions
                </Link>
              </>
            }
          >
            Vérifiez l&apos;orthographe ou essayez un terme plus général.
          </EtatVide>
        ) : (
          <>
            <p role="status" className="surtitre text-encre-3">
              {resultats.length} résultat{resultats.length > 1 ? "s" : ""}
            </p>
            <div className="mt-8 space-y-14">
              {groupes.map((g) => (
                <section key={g.type} aria-labelledby={`g-${g.type}`}>
                  <h2 id={`g-${g.type}`} className="surtitre border-trait-fort border-t-2 pt-3">
                    {libellesTypes[g.type]} · {g.liste.length}
                  </h2>
                  <ul className="divide-trait mt-2 divide-y">
                    {g.liste.map((r) => (
                      <li key={r.href}>
                        <Link href={r.href} className="group block py-5">
                          <span className="titre-carte group-hover:text-accent-encre block text-[1.2rem]">
                            {r.titre}
                          </span>
                          <span className="text-encre-3 mt-1 block text-sm">{r.contexte}</span>
                          {r.extrait && (
                            <span className="text-encre-2 mt-2 line-clamp-2 block">
                              {r.extrait}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
