import { CategoryPage } from "@/components/news/CategoryPage"
import { categories } from "@/data/categories"
import { metadataPage } from "@/lib/seo/metadata"

const cat = categories["actu-music"]
export const metadata = metadataPage({
  titre: cat.titreSeo,
  description: cat.description,
  chemin: cat.chemin,
})

export default function Page(props: PageProps<"/actu-music">) {
  return <CategoryPage slug="actu-music" searchParams={props.searchParams} />
}
