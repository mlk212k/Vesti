import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OUTFITS_BUCKET } from "@/lib/supabase/storage";
import { PLAN_COLUMNS, planOf, hasFeature, type PlanRow } from "@/lib/plans";
import { AnalysisDetail } from "@/components/history/analysis-detail";
import type { GarmentView } from "@/components/analyze/verdict-card";

/** Une heure : le temps de lire la page, pas de partager le lien. */
const PHOTO_URL_TTL = 3600;

interface AnalysisRow {
  id: string;
  score: number | null;
  occasion: string | null;
  image_paths: string[];
  created_at: string;
  verdict: {
    verdict?: string;
    strengths?: string[];
    improvements?: string[];
  } | null;
}

/**
 * Le détail d'une analyse passée.
 *
 * Ce que la base garde d'une analyse est plus mince que ce qui s'affiche juste
 * après l'avoir faite : le verdict, les points forts et les axes de progrès
 * vivent dans une colonne JSON, mais les pièces détectées sont ailleurs — dans
 * la garde-robe, et seulement pour les plans qui la conservent. La page
 * rassemble les deux, et se tait sur les pièces quand il n'y en a pas plutôt
 * que d'afficher une section vide.
 */
export default async function AnalysisPage({ params }: PageProps<"/history/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(PLAN_COLUMNS)
    .eq("id", user.id)
    .single<PlanRow>();

  if (!hasFeature(planOf(profile), "history")) redirect("/history");

  // Le filtre sur `user_id` double la RLS. Un identifiant se devine mal, mais
  // il se partage : une analyse n'a pas à s'ouvrir hors de son compte.
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, score, occasion, image_paths, created_at, verdict")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<AnalysisRow>();

  if (!analysis) notFound();

  const { data: items } = await supabase
    .from("dressing_items")
    .select(
      "category, label, color, material, brand, brand_confidence, crop_box, confidence, product_matches"
    )
    .eq("analysis_id", analysis.id)
    .eq("user_id", user.id);

  const path = analysis.image_paths?.[0];
  let photoUrl: string | null = null;
  if (path) {
    const { data: signed } = await supabase.storage
      .from(OUTFITS_BUCKET)
      .createSignedUrl(path, PHOTO_URL_TTL);
    photoUrl = signed?.signedUrl ?? null;
  }

  const garments = (items ?? []).map((item) => ({
    ...item,
    product_matches: Array.isArray(item.product_matches) ? item.product_matches : [],
  })) as GarmentView[];

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      <Link
        href="/history"
        className="self-start text-sm font-semibold text-accent-strong"
        style={{ touchAction: "manipulation" }}
      >
        ← Historique
      </Link>

      <AnalysisDetail
        score={analysis.score}
        occasion={analysis.occasion}
        createdAt={analysis.created_at}
        verdict={analysis.verdict?.verdict ?? null}
        strengths={analysis.verdict?.strengths ?? []}
        improvements={analysis.verdict?.improvements ?? []}
        garments={garments}
        photoUrl={photoUrl}
      />
    </main>
  );
}
