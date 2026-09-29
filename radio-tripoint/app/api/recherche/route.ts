import { rechercher } from "@/lib/contenu/recherche"

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100)
  const resultats = await rechercher(q, 12)
  return Response.json(
    { resultats },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
  )
}
