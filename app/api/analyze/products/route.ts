import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findProductMatches } from "@/lib/claude/find-products";
import { hasFeature, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";

const bodySchema = z.object({
  analysisId: z.uuid(),
});

/** Les recherches web sont lentes par nature : elles ont besoin d'air. */
export const maxDuration = 120;

/**
 * Plafond de recherches par analyse.
 *
 * ⚠️ C'était le seul coût NON BORNÉ de l'app : une recherche partait par
 * vêtement détecté, sans limite. Une photo avec un dressing en fond pouvait en
 * déclencher dix, et dix recherches sur un abonnement à 17,99 € par mois
 * mangent la marge d'un coup.
 *
 * Trois suffisent : au-delà, on propose des liens pour des pièces secondaires
 * que personne ne clique.
 */
const MAX_PRODUCT_SEARCHES = 3;

/**
 * Cherche les produits d'une analyse — APRÈS que le verdict a été rendu.
 *
 * Cette route existe pour une raison de vitesse. Ces recherches se faisaient
 * avant à l'intérieur de l'analyse, et le verdict, prêt depuis longtemps,
 * attendait qu'elles finissent. L'abonné qui paie le plus cher attendait donc
 * le plus longtemps, et la requête restait ouverte deux fois plus longtemps :
 * deux fois plus d'occasions de tomber sur un réseau mobile.
 *
 * 🔒 Le navigateur n'envoie qu'un identifiant d'analyse. TOUT ce qui décide du
 * contenu — et donc du coût — des recherches est relu en base : les pièces, les
 * mots-clés, le plan. Laisser passer une requête de recherche fournie par le
 * client reviendrait à laisser n'importe qui dépenser sur notre compte.
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

  if (!hasFeature(planOf(profile), "shopping")) {
    return NextResponse.json({ error: "plan_required" }, { status: 403 });
  }

  // Lecture avec le client de l'utilisateur : les policies RLS garantissent
  // qu'on ne peut pas déclencher des recherches sur l'analyse d'autrui.
  const { data: items } = await supabase
    .from("dressing_items")
    .select(
      "id, category, label, color, material, brand, brand_confidence, crop_box, confidence, search_terms, product_matches"
    )
    .eq("analysis_id", parsed.data.analysisId)
    .eq("user_id", user.id)
    .order("confidence", { ascending: false, nullsFirst: false })
    .returns<Item[]>();

  if (!items?.length) {
    return NextResponse.json({ garments: [] });
  }

  // Déjà cherché : on rend ce qui existe. Sans ça, un client qui relance —
  // parce que sa connexion a lâché, ou parce qu'il revient sur l'analyse —
  // repaierait des recherches déjà faites.
  const alreadySearched = items.some((item) => (item.product_matches ?? []).length > 0);
  if (alreadySearched) {
    return NextResponse.json({ garments: items.map(toGarmentView), cached: true });
  }

  // Les pièces les plus sûrement identifiées d'abord (la requête les trie déjà
  // par confiance) : chercher un produit pour un vêtement reconnu à 40 % de
  // confiance, c'est payer une recherche pour un résultat à côté.
  const searched = await Promise.all(
    items.slice(0, MAX_PRODUCT_SEARCHES).map(async (item) => ({
      id: item.id,
      matches: await findProductMatches({
        label: item.label,
        color: item.color ?? "",
        material: item.material,
        search_terms: item.search_terms ?? [],
      }),
    }))
  );

  // Écriture par le client admin : `dressing_items` n'est pas écrivable par le
  // navigateur, et ces liens ne doivent jamais l'être.
  const admin = createAdminClient();
  await Promise.all(
    searched
      .filter((entry) => entry.matches.length > 0)
      .map((entry) =>
        admin
          .from("dressing_items")
          .update({ product_matches: entry.matches })
          .eq("id", entry.id)
      )
  );

  const foundById = new Map(searched.map((entry) => [entry.id, entry.matches]));

  return NextResponse.json({
    garments: items.map((item) =>
      toGarmentView({ ...item, product_matches: foundById.get(item.id) ?? [] })
    ),
  });
}

interface Item {
  id: string;
  category: string;
  label: string;
  color: string | null;
  material: string | null;
  brand: string | null;
  brand_confidence: string | null;
  crop_box: unknown;
  confidence: number | null;
  search_terms: string[] | null;
  product_matches: unknown[] | null;
}

/** Même forme que les pièces rendues par /api/analyze : le client remplace, il ne fusionne pas. */
function toGarmentView(item: Item) {
  return {
    category: item.category,
    label: item.label,
    color: item.color ?? "",
    material: item.material,
    brand: item.brand,
    brand_confidence: item.brand_confidence ?? "inconnue",
    crop_box: item.crop_box,
    confidence: item.confidence ?? 0,
    product_matches: item.product_matches ?? [],
  };
}
