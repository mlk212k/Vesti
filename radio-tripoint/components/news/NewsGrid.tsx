import type { Article } from "@/types/article"
import { NewsCard } from "./NewsCard"

export function NewsGrid({
  articles,
  titreNiveau = "h3",
}: {
  articles: Article[]
  titreNiveau?: "h2" | "h3"
}) {
  return (
    <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((a) => (
        <li key={a.slug}>
          <NewsCard article={a} titreNiveau={titreNiveau} />
        </li>
      ))}
    </ul>
  )
}
