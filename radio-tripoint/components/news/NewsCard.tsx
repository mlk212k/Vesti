import Link from "next/link"
import { categories } from "@/data/categories"
import { teinteCategorie } from "@/lib/contenu/teintes"
import { dateRelative } from "@/lib/utils/dates"
import { tempsLecture } from "@/lib/utils/texte"
import { cn } from "@/lib/utils/cn"
import type { Article } from "@/types/article"
import { Visuel } from "@/components/ui/Visuel"

export function MetaArticle({ article, className }: { article: Article; className?: string }) {
  return (
    <p className={cn("text-encre-3 flex flex-wrap items-center gap-x-2 text-[0.8rem]", className)}>
      <time dateTime={article.publieLe}>{dateRelative(article.publieLe)}</time>
      <span aria-hidden>·</span>
      <span>{tempsLecture(article.corps)} min de lecture</span>
    </p>
  )
}

export function BadgeArticle({ article }: { article: Article }) {
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className="badge">{categories[article.categorie].court}</span>
      {article.lieux?.[0] && (
        <span className="text-encre-3 text-[0.75rem] font-medium">{article.lieux[0]}</span>
      )}
      {article.demo && <span className="badge-exemple">Exemple</span>}
    </p>
  )
}

/** Carte standard : visuel, rubrique, titre, méta. */
export function NewsCard({
  article,
  titreNiveau: Titre = "h3",
  avecChapeau = false,
  sizes = "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw",
}: {
  article: Article
  titreNiveau?: "h2" | "h3"
  avecChapeau?: boolean
  sizes?: string
}) {
  const cat = categories[article.categorie]
  return (
    <article className="carte group flex flex-col">
      <Visuel
        visuel={article.visuel}
        repli={{
          mot: cat.court,
          surmot: "Radio Tripoint",
          teinte: teinteCategorie[article.categorie],
        }}
        sizes={sizes}
      />
      <div className="mt-4 flex flex-1 flex-col">
        <BadgeArticle article={article} />
        <Titre className="carte-titre titre-carte mt-2 text-[1.2rem] sm:text-[1.28rem]">
          <Link href={`/actualites/${article.slug}`} className="carte-lien">
            {article.titre}
          </Link>
        </Titre>
        {avecChapeau && (
          <p className="presse text-encre-2 mt-2 line-clamp-3 text-[1.05rem] leading-snug">
            {article.chapeau}
          </p>
        )}
        <MetaArticle article={article} className="mt-3" />
      </div>
    </article>
  )
}

/** Carte horizontale compacte : vignette à gauche. Pour les colonnes secondaires. */
export function NewsCardLigne({ article }: { article: Article }) {
  const cat = categories[article.categorie]
  return (
    <article className="carte group grid grid-cols-[1fr_7rem] gap-4 sm:grid-cols-[1fr_8.5rem]">
      <div className="min-w-0">
        <BadgeArticle article={article} />
        <h3 className="carte-titre titre-carte mt-1.5 line-clamp-3 text-[1.05rem]">
          <Link href={`/actualites/${article.slug}`} className="carte-lien">
            {article.titre}
          </Link>
        </h3>
        <MetaArticle article={article} className="mt-2" />
      </div>
      <Visuel
        visuel={article.visuel}
        repli={{ mot: cat.court, teinte: teinteCategorie[article.categorie], taille: "petit" }}
        ratio="aspect-square"
        sizes="140px"
      />
    </article>
  )
}
