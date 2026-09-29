import { Search } from "lucide-react"
import Link from "next/link"
import { BoutonDirect } from "@/components/radio/BoutonDirect"
import { EtatVide } from "@/components/ui/EtatVide"
import { PageHero } from "@/components/ui/PageHero"
import { Pagination } from "@/components/ui/Pagination"
import { categories } from "@/data/categories"
import { listerArticles } from "@/lib/contenu/articles"
import type { CategorieSlug } from "@/types/category"
import { CategoryNav } from "./CategoryNav"
import { FeaturedArticle } from "./FeaturedArticle"
import { NewsGrid } from "./NewsGrid"

/** Gabarit commun à toutes les rubriques : une, grille, recherche, pagination. */
export async function CategoryPage({
  slug,
  searchParams,
}: {
  slug: CategorieSlug
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : undefined
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1)
  const cat = categories[slug]
  const { elements, pages, page: p, total } = await listerArticles({ categorie: slug, q, page })
  const avecUne = p === 1 && !q && elements.length > 0
  const [premier, ...reste] = elements

  return (
    <>
      <PageHero
        miettes={[{ nom: cat.nom, chemin: cat.chemin }]}
        surtitre={
          slug === "actualites" ? "Trois Frontières · Moselle · Luxembourg · Sarre" : "Rubrique"
        }
        titre={cat.nom}
        intro={cat.accroche}
        enfants={
          <div className="mt-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <CategoryNav active={slug} />
            <form role="search" action={cat.chemin} className="relative w-full flex-none lg:w-72">
              <label htmlFor="q-rubrique" className="sr-only">
                Rechercher dans {cat.nom}
              </label>
              <Search
                className="text-encre-3 pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <input
                id="q-rubrique"
                name="q"
                type="search"
                defaultValue={q}
                placeholder={`Rechercher dans ${cat.court}…`}
                className="champ !min-h-11 pl-10"
              />
            </form>
          </div>
        }
      />

      <div className="conteneur py-12 lg:py-16">
        {q && (
          <p className="text-encre-2 mb-8" role="status">
            {total} résultat{total > 1 ? "s" : ""} pour «{" "}
            <strong className="text-encre">{q}</strong> » ·{" "}
            <Link href={cat.chemin} className="lien">
              effacer
            </Link>
          </p>
        )}
        {elements.length === 0 ? (
          q ? (
            <EtatVide
              titre="Aucun article ne correspond à votre recherche."
              actions={
                <Link href={`/recherche?q=${encodeURIComponent(q)}`} className="btn btn-trait">
                  Chercher sur tout le site
                </Link>
              }
            >
              Essayez un autre mot, un nom de commune ou d&apos;émission.
            </EtatVide>
          ) : (
            <EtatVide
              titre={`Pas encore d'article dans « ${cat.nom} ».`}
              actions={
                <>
                  <Link href="/soumettre-une-information" className="btn btn-plein">
                    Proposer une information
                  </Link>
                  <BoutonDirect />
                </>
              }
            >
              {cat.description} Les premiers articles de cette rubrique arrivent bientôt.
            </EtatVide>
          )
        ) : (
          <>
            {avecUne && premier && (
              <div className="border-trait mb-14 border-b pb-14">
                <h2 className="sr-only">À la une de la rubrique</h2>
                <FeaturedArticle article={premier} preload />
              </div>
            )}
            <h2 className="sr-only">{avecUne ? "Derniers articles" : "Articles"}</h2>
            <NewsGrid articles={avecUne ? reste : elements} />
            <Pagination page={p} pages={pages} base={cat.chemin} params={{ q }} />
          </>
        )}
      </div>
    </>
  )
}
