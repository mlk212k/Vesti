import Link from "next/link"
import { categories, ordreCategories } from "@/data/categories"
import type { CategorieSlug } from "@/types/category"

/** Navigation entre rubriques, en rail défilant sur mobile. */
export function CategoryNav({ active }: { active: CategorieSlug }) {
  return (
    <nav aria-label="Rubriques" className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <ul className="rail py-1">
        {ordreCategories.map((slug) => {
          const c = categories[slug]
          return (
            <li key={slug} className="flex-none">
              <Link
                href={c.chemin}
                aria-current={slug === active ? "page" : undefined}
                className="puce-filtre"
              >
                {slug === "actualites" ? "Tout" : c.nom}
              </Link>
            </li>
          )
        })}
        <li className="flex-none">
          <Link href="/agenda" className="puce-filtre">
            Agenda
          </Link>
        </li>
      </ul>
    </nav>
  )
}
