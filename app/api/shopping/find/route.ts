import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { searchProducts } from "@/lib/claude/find-products";
import { hasBudgetLeft, recordSpend } from "@/lib/ai-budget";
import { hasFeature, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import type { Profile } from "@/types/db";

const bodySchema = z.object({
  // Assez long pour une vraie demande, assez court pour rester une recherche.
  query: z.string().trim().min(3).max(160),
});

/** La recherche web prend plusieurs secondes ; la limite par défaut est courte. */
export const maxDuration = 120;

/**
 * Recherche libre : la personne décrit ce qu'elle cherche, on va le trouver.
 *
 * Différente de `/api/shopping/search`, qui part d'un manque repéré dans le
 * dressing. Ici c'est l'utilisateur qui mène — mais son profil accompagne
 * quand même la demande, sinon « un jean droit » renverrait le même résultat
 * à tout le monde.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`${PLAN_COLUMNS}, gender, height_cm, morphology, style_prefs`)
    .eq("id", user.id)
    .single<
      PlanRow & Pick<Profile, "gender" | "height_cm" | "morphology" | "style_prefs">
    >();

  // La recherche web est facturée à l'usage : elle reste derrière le plan qui
  // la vend.
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

  // Les recherches web sont la dépense la plus lourde de l'app : on vérifie
  // l'enveloppe du mois avant d'en lancer une.
  if (!(await hasBudgetLeft(user.id))) {
    return NextResponse.json(
      {
        error: "budget_reached",
        message: {
          title: "Recherches épuisées pour ce mois",
          body: "Tu as utilisé toutes les recherches de produits de ton forfait. Elles repartent au prochain cycle — tes analyses, elles, continuent normalement.",
        },
      },
      { status: 402 }
    );
  }

  const { matches, costMicros } = await searchProducts(parsed.data.query, {
    gender: profile.gender,
    height_cm: profile.height_cm,
    morphology: profile.morphology,
    style_prefs: profile.style_prefs,
  });

  await recordSpend(user.id, "product_search", costMicros);

  return NextResponse.json({ matches });
}
