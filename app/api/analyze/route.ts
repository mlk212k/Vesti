import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadImageForClaude } from "@/lib/supabase/storage";
import { consumeQuota, refundQuota, quotaRefusalMessage } from "@/lib/quota";
import { analyzeOutfit, OutfitAnalysisRefused } from "@/lib/claude/analyze-outfit";
import { findProductMatches } from "@/lib/claude/find-products";
import { hasFeature, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import { awardReferralStyle } from "@/lib/style.server";
import type { Garment } from "@/lib/claude/schemas";
import type { Profile } from "@/types/db";

const bodySchema = z.object({
  imagePath: z.string().min(3).max(200),
});

/** Le temps d'analyse dépasse la limite par défaut de certaines plateformes. */
export const maxDuration = 120;

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

  const { imagePath } = parsed.data;

  // Le chemin vient du client : on vérifie qu'il appartient bien à cet
  // utilisateur avant de l'utiliser, sans se reposer seulement sur la policy
  // Storage.
  if (!imagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`gender, height_cm, weight_kg, morphology, style_prefs, ${PLAN_COLUMNS}`)
    .eq("id", user.id)
    .single<
      PlanRow &
        Pick<
          Profile,
          "gender" | "height_cm" | "weight_kg" | "morphology" | "style_prefs"
        >
    >();

  if (!profile) {
    return NextResponse.json({ error: "no_profile" }, { status: 403 });
  }

  // --- Quota : consommé avant tout appel au modèle -------------------------
  const quota = await consumeQuota("outfit");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.reason, message: quotaRefusalMessage(quota), quota },
      { status: 402 }
    );
  }

  try {
    const image = await loadImageForClaude(imagePath);
    const { analysis, usage, model } = await analyzeOutfit(image, profile);

    const plan = planOf(profile);
    const keepsWardrobe = hasFeature(plan, "dressing");
    const getsShopping = hasFeature(plan, "shopping");

    // Les liens produits sont facturés à l'usage : réservés au plan qui les vend.
    const garmentsWithProducts = getsShopping
      ? await attachProductMatches(analysis.garments)
      : analysis.garments.map((garment) => ({ garment, matches: [] }));

    const admin = createAdminClient();

    const { data: inserted } = await admin
      .from("analyses")
      .insert({
        user_id: user.id,
        kind: "outfit",
        image_paths: [imagePath],
        verdict: {
          verdict: analysis.verdict,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
        },
        score: analysis.score,
        occasion: analysis.occasion,
        model,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
      })
      .select("id")
      .single();

    if (keepsWardrobe && inserted?.id) {
      await admin.from("dressing_items").insert(
        garmentsWithProducts.map(({ garment, matches }) => ({
          user_id: user.id,
          analysis_id: inserted.id,
          category: garment.category,
          label: garment.label,
          color: garment.color,
          material: garment.material,
          pattern: garment.pattern,
          fit: garment.fit,
          season: garment.season,
          brand: garment.brand,
          brand_confidence: garment.brand_confidence,
          source_image_path: imagePath,
          crop_box: garment.crop_box,
          product_matches: matches,
          confidence: garment.confidence,
        }))
      );
    }

    // Le parrain n'est payé qu'ici : après une analyse réellement rendue, et
    // pas à l'inscription du filleul. Sans effet si celui-ci n'a pas de parrain
    // ou si le versement a déjà eu lieu.
    await awardReferralStyle(user.id);

    return NextResponse.json({
      analysisId: inserted?.id ?? null,
      score: analysis.score,
      verdict: analysis.verdict,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      occasion: analysis.occasion,
      garments: garmentsWithProducts.map(({ garment, matches }) => ({
        ...garment,
        product_matches: matches,
      })),
      savedToWardrobe: keepsWardrobe,
      quota,
    });
  } catch (error) {
    // L'analyse a échoué après consommation : on rend le crédit, sinon une
    // panne de notre côté coûte une analyse à l'utilisateur.
    await refundQuota();

    if (error instanceof OutfitAnalysisRefused) {
      return NextResponse.json(
        {
          error: "refused",
          message: {
            title: "Photo non analysable",
            body: "Envoie une photo de la tenue, en pied ou à plat, sans autre contenu.",
          },
        },
        { status: 422 }
      );
    }

    console.error("[analyze] échec", error);
    return NextResponse.json(
      {
        error: "analysis_failed",
        message: {
          title: "L'analyse n'a pas abouti",
          body: "Ton crédit n'a pas été décompté. Réessaie dans un instant.",
        },
      },
      { status: 502 }
    );
  }
}

async function attachProductMatches(garments: Garment[]) {
  return Promise.all(
    garments.map(async (garment) => ({
      garment,
      matches: await findProductMatches(garment),
    }))
  );
}
