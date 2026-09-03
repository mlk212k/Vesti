import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadImageForClaude } from "@/lib/supabase/storage";
import { consumeQuota, releaseQuota, quotaRefusalMessage } from "@/lib/quota";
import { analyzeOutfit, OutfitAnalysisRefused } from "@/lib/claude/analyze-outfit";
import { costMicros } from "@/lib/claude/pricing";
import { recordSpend } from "@/lib/ai-budget";
import { hasFeature, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import { awardReferralStyle } from "@/lib/style.server";
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

  // --- Cette photo a-t-elle déjà été analysée ? ----------------------------
  //
  // ⚠️ C'est ce qui rend l'analyse REJOUABLE, et ça répare une vraie perte.
  // L'analyse dure une trentaine de secondes ; sur un réseau mobile faible, la
  // connexion tombe avant la réponse. Le serveur, lui, va au bout : il facture
  // le crédit, appelle le modèle, enregistre le verdict — que personne ne voit
  // jamais. L'utilisateur reçoit une erreur pour un travail réellement fait et
  // déjà payé.
  //
  // Le chemin de la photo identifie l'analyse de façon stable (il contient un
  // UUID tiré à l'envoi). Retenter la même photo rend donc le verdict déjà
  // calculé, sans nouvel appel au modèle et sans reprendre un second crédit.
  const recovered = await recoverAnalysis(supabase, user.id, imagePath);
  if (recovered) {
    return NextResponse.json({
      ...recovered,
      recovered: true,
      // Une analyse récupérée peut n'avoir jamais eu ses liens : la connexion
      // a pu tomber entre le verdict et la recherche.
      productsPending:
        hasFeature(planOf(profile), "shopping") &&
        Boolean(recovered.analysisId) &&
        recovered.garments.every((g) => g.product_matches.length === 0),
    });
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

    const verdictCost = costMicros(model, usage.inputTokens, usage.outputTokens);
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
        // Le coût est figé ici, au tarif du jour : recalculé plus tard, il
        // serait faux dès le prochain changement de prix ou de modèle.
        cost_micros: verdictCost,
      })
      .select("id")
      .single();

    if (keepsWardrobe && inserted?.id) {
      await admin.from("dressing_items").insert(
        analysis.garments.map((garment) => ({
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
          // Vides à ce stade : la recherche est différée (voir /api/analyze/products).
          product_matches: [],
          // Conservés pour que cette recherche différée n'ait besoin de rien
          // venant du navigateur.
          search_terms: garment.search_terms,
          confidence: garment.confidence,
        }))
      );
    }

    // Toute dépense IA passe au registre, pas seulement celles rattachées à
    // une analyse : c'est lui qui garantit la marge du mois.
    await recordSpend(user.id, "verdict", verdictCost);

    // Le parrain n'est payé qu'ici : après une analyse réellement rendue, et
    // pas à l'inscription du filleul. Sans effet si celui-ci n'a pas de parrain
    // ou si le versement a déjà eu lieu.
    await awardReferralStyle(user.id);

    // L'analyse est en base : c'est elle qui compte désormais. Sans cette
    // libération, elle serait comptée deux fois — une fois comme rendue, une
    // fois comme encore en route — jusqu'à expiration de la réservation.
    await releaseQuota(quota.reservation_id);

    return NextResponse.json({
      analysisId: inserted?.id ?? null,
      score: analysis.score,
      verdict: analysis.verdict,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
      occasion: analysis.occasion,
      garments: analysis.garments.map((garment) => ({
        ...garment,
        product_matches: [],
      })),
      savedToWardrobe: keepsWardrobe,
      // Dit au client d'aller chercher les liens dans un second temps. Les
      // recherches sont facturées à l'usage : réservées au plan qui les vend.
      productsPending: getsShopping && Boolean(inserted?.id),
      quota,
    });
  } catch (error) {
    // L'analyse a échoué après consommation : on rend le crédit, sinon une
    // panne de notre côté coûte une analyse à l'utilisateur.
    await releaseQuota(quota.reservation_id);

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

/**
 * Retrouve le verdict déjà calculé pour cette photo, s'il existe.
 *
 * Lecture faite avec le client de l'utilisateur, pas le client admin : les
 * policies RLS garantissent alors qu'on ne peut pas ressortir l'analyse de
 * quelqu'un d'autre, même si le chemin fourni était deviné.
 *
 * En cas d'erreur de lecture on rend `null` : on refait l'analyse. Redonner un
 * verdict est ennuyeux, ne rien rendre du tout l'est davantage.
 */
async function recoverAnalysis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  imagePath: string
) {
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, score, occasion, verdict")
    .eq("user_id", userId)
    .contains("image_paths", [imagePath])
    .maybeSingle<{
      id: string;
      score: number | null;
      occasion: string | null;
      verdict: {
        verdict?: string;
        strengths?: string[];
        improvements?: string[];
      } | null;
    }>();

  if (!analysis?.verdict?.verdict) return null;

  // Les pièces ne sont enregistrées que pour les plans qui gardent un dressing.
  // Leur absence n'empêche pas de rendre le verdict, qui est l'essentiel.
  const { data: items } = await supabase
    .from("dressing_items")
    .select(
      "category, label, color, material, brand, brand_confidence, crop_box, confidence, product_matches"
    )
    .eq("analysis_id", analysis.id);

  return {
    analysisId: analysis.id,
    score: analysis.score ?? 0,
    verdict: analysis.verdict.verdict,
    strengths: analysis.verdict.strengths ?? [],
    improvements: analysis.verdict.improvements ?? [],
    occasion: analysis.occasion ?? "",
    garments: (items ?? []).map((item) => ({
      ...item,
      product_matches: item.product_matches ?? [],
    })),
    savedToWardrobe: (items?.length ?? 0) > 0,
  };
}
