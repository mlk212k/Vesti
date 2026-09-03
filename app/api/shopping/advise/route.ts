import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { advisePurchases, type AnalysedOutfit } from "@/lib/claude/advise-purchases";
import { searchProducts } from "@/lib/claude/find-products";
import { hasFeature, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import type { Profile } from "@/types/db";

/** Un diagnostic puis trois recherches web : c'est long, et la limite est courte. */
export const maxDuration = 180;

/** Assez d'analyses pour voir un défaut récurrent, pas assez pour noyer le modèle. */
const HISTORY_SIZE = 8;

/**
 * Suggestions d'achat déduites des tenues déjà analysées.
 *
 * Déclenchée par un geste explicite, jamais au chargement : elle enchaîne un
 * diagnostic et jusqu'à trois recherches web, toutes facturées. L'ouvrir
 * automatiquement ferait payer une page que personne ne regarde.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`${PLAN_COLUMNS}, gender, height_cm, morphology, style_prefs`)
    .eq("id", user.id)
    .single<
      PlanRow & Pick<Profile, "gender" | "height_cm" | "morphology" | "style_prefs">
    >();

  if (!profile || !hasFeature(planOf(profile), "shopping")) {
    return NextResponse.json(
      {
        error: "plan_required",
        message: {
          title: "Réservé au plan Styliste",
          body: "Les recommandations d'achat font partie du plan Styliste.",
        },
      },
      { status: 402 }
    );
  }

  const [{ data: analyses }, { data: items }] = await Promise.all([
    supabase
      .from("analyses")
      .select("score, occasion, verdict, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(HISTORY_SIZE),
    supabase
      .from("dressing_items")
      .select("label")
      .eq("user_id", user.id)
      .limit(150),
  ]);

  const outfits: AnalysedOutfit[] = (analyses ?? []).map((row) => {
    const verdict = row.verdict as
      | { verdict?: string; improvements?: string[] }
      | null;
    return {
      score: row.score,
      occasion: row.occasion,
      verdict: verdict?.verdict ?? null,
      improvements: Array.isArray(verdict?.improvements) ? verdict.improvements : [],
    };
  });

  if (outfits.length === 0) {
    return NextResponse.json({ pieces: [] });
  }

  const wardrobe = (items ?? [])
    .map((item) => item.label)
    .filter((label): label is string => typeof label === "string");

  const pieces = await advisePurchases(outfits, wardrobe);

  // Les recherches partent en parallèle : trois en série ajouteraient trois
  // temps d'attente bout à bout, sur une page qui attend déjà le diagnostic.
  const withProducts = await Promise.all(
    pieces.map(async (piece) => ({
      ...piece,
      matches: (
        await searchProducts(piece.search, {
          gender: profile.gender,
          height_cm: profile.height_cm,
          morphology: profile.morphology,
          style_prefs: profile.style_prefs,
        })
      ).matches,
    }))
  );

  return NextResponse.json({ pieces: withProducts });
}
