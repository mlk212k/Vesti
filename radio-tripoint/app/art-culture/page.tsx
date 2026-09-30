import { CategoryPage } from "@/components/news/CategoryPage"
import { categories } from "@/data/categories"
import { metadataPage } from "@/lib/seo/metadata"

const cat = categories["art-culture"]
export const metadata = metadataPage({
  titre: cat.titreSeo,
  description: cat.description,
  chemin: cat.chemin,
})

export default function Page(props: PageProps<"/art-culture">) {
  return <CategoryPage slug="art-culture" searchParams={props.searchParams} />
}
