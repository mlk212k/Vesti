import Link from "next/link"
import { categories } from "@/data/categories"
import { teinteCategorie } from "@/lib/contenu/teintes"
import type { Article } from "@/types/article"
import { Visuel } from "@/components/ui/Visuel"
import { BadgeArticle, MetaArticle } from "./NewsCard"

/** La une : grand visuel, grand titre, chapeau en serif. */
export function FeaturedArticle({ article, preload }: { article: Article; preload?: boolean }) {
  const cat = categories[article.categorie]
  return (
    <article className="carte group">
      <Visuel
        visuel={article.visuel}
        repli={{
          mot: cat.nom,
          surmot: "À la une",
          teinte: teinteCategorie[article.categorie],
          taille: "grand",
        }}
        ratio="aspect-[4/3] sm:aspect-[16/10]"
        sizes="(min-width: 1024px) 58vw, 100vw"
        preload={preload}
      />
      <div className="mt-5">
        <BadgeArticle article={article} />
        <h3 className="carte-titre titre-affiche mt-3 text-[clamp(1.8rem,1.1rem+2.6vw,3rem)] !leading-[1.02]">
          <Link href={`/actualites/${article.slug}`} className="carte-lien">
            {article.titre}
          </Link>
        </h3>
        <p className="presse text-encre-2 mt-4 max-w-2xl text-[1.2rem] leading-snug">
          {article.chapeau}
        </p>
        <MetaArticle article={article} className="mt-4" />
      </div>
    </article>
  )
}
