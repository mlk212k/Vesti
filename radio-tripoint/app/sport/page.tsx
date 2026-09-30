import { CategoryPage } from "@/components/news/CategoryPage"
import { categories } from "@/data/categories"
import { metadataPage } from "@/lib/seo/metadata"

const cat = categories["sport"]
export const metadata = metadataPage({
  titre: cat.titreSeo,
  description: cat.description,
  chemin: cat.chemin,
})

export default function Page(props: PageProps<"/sport">) {
  return <CategoryPage slug="sport" searchParams={props.searchParams} />
}
