import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchProducts } from "@/lib/claude/find-products";
import { hasBudgetLeft, recordSpend } from "@/lib/ai-budget";
import { hasFeature, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";

const bodySchema = z.object({
  suggestionId: z.string().uuid(),
});

export const maxDuration = 120;

/**
 * Cherche des produits pour une pièce manquante, à la demande.
 *
 * Déclenché par un geste explicite de l'utilisateur, et jamais au chargement de
 * la page : la recherche web est facturée à l'usage, l'appeler à chaque
 * affichage ferait payer une liste qui ne change pas.
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
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(PLAN_COLUMNS)
    .eq("id", user.id)
    .single<PlanRow>();

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

  // La lecture passe par le client utilisateur : la RLS garantit qu'on ne peut
  // pas faire chercher des produits pour la suggestion de quelqu'un d'autre.
  const { data: suggestion } = await supabase
    .from("shopping_suggestions")
    .select("id, item, occasion, searched_at, product_matches")
    .eq("id", parsed.data.suggestionId)
    .single<{
      id: string;
      item: string;
      occasion: string | null;
      searched_at: string | null;
      product_matches: unknown[];
    }>();

  if (!suggestion) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Déjà cherché : on renvoie le résultat stocké plutôt que de repayer.
  if (suggestion.searched_at) {
    return NextResponse.json({ matches: suggestion.product_matches, cached: true });
  }

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

  const query = [suggestion.item, suggestion.occasion].filter(Boolean).join(" ");
  const { matches, costMicros } = await searchProducts(query);
  await recordSpend(user.id, "product_search", costMicros);

  const admin = createAdminClient();
  await admin
    .from("shopping_suggestions")
    // `searched_at` est posé même quand la recherche ne donne rien : sans lui,
    // une recherche infructueuse serait relancée à chaque clic.
    .update({ product_matches: matches, searched_at: new Date().toISOString() })
    .eq("id", suggestion.id);

  return NextResponse.json({ matches, cached: false });
}
