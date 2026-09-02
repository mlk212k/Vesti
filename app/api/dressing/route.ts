import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadImageForClaude } from "@/lib/supabase/storage";
import { consumeQuota, refundQuota, quotaRefusalMessage } from "@/lib/quota";
import { analyzeDressing } from "@/lib/claude/analyze-dressing";
import { OutfitAnalysisRefused } from "@/lib/claude/analyze-outfit";
import type { Profile } from "@/types/db";

/**
 * Plafond de photos par scan.
 *
 * Chaque image coûte des tokens : au-delà, le prix d'un scan dérape et la
 * précision de l'inventaire baisse plutôt que de monter. Le client applique la
 * même limite, mais c'est ici qu'elle est réellement tenue.
 */
const MAX_PHOTOS = 8;

const bodySchema = z.object({
  imagePaths: z.array(z.string().min(3).max(200)).min(1).max(MAX_PHOTOS),
});

/** Le scan multi-photos est nettement plus long qu'une analyse de tenue. */
export const maxDuration = 300;

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

  const { imagePaths } = parsed.data;

  // Les chemins viennent du client : chacun doit appartenir à cet utilisateur.
  if (imagePaths.some((path) => !path.startsWith(`${user.id}/`))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("gender, height_cm, weight_kg, morphology, style_prefs")
    .eq("id", user.id)
    .single<
      Pick<Profile, "gender" | "height_cm" | "weight_kg" | "morphology" | "style_prefs">
    >();

  if (!profile) {
    return NextResponse.json({ error: "no_profile" }, { status: 403 });
  }

  // Le RPC porte à la fois le décompte et le verrou de plan : le scan de
  // dressing est réservé au Pro+, et c'est Postgres qui le tranche.
  const quota = await consumeQuota("dressing");
  if (!quota.allowed) {
    return NextResponse.json(
      { error: quota.reason, message: quotaRefusalMessage(quota), quota },
      { status: 402 }
    );
  }

  try {
    // L'ordre est significatif : il détermine `source_index`, donc la photo dans
    // laquelle chaque vignette sera découpée.
    const images = await Promise.all(imagePaths.map(loadImageForClaude));
    const { analysis, usage, model } = await analyzeDressing(images, profile);

    const admin = createAdminClient();

    const { data: inserted } = await admin
      .from("analyses")
      .insert({
        user_id: user.id,
        kind: "dressing",
        image_paths: imagePaths,
        verdict: {
          summary: analysis.summary,
          outfits: analysis.outfits,
          gaps: analysis.gaps,
        },
        model,
        input_tokens: usage.inputTokens,
        output_tokens: usage.outputTokens,
      })
      .select("id")
      .single();

    if (inserted?.id && analysis.garments.length > 0) {
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
          // Chaque pièce garde la photo d'où elle vient, pas la première du lot.
          source_image_path: imagePaths[garment.source_index],
          crop_box: garment.crop_box,
          confidence: garment.confidence,
        }))
      );
    }

    // Les manques deviennent des recommandations d'achat durables. Le conflit
    // sur (user_id, lower(item)) évite qu'un même manque, repéré à chaque scan,
    // s'accumule en doublons — et préserve la recherche produit déjà payée pour
    // cette ligne.
    if (inserted?.id && analysis.gaps.length > 0) {
      await admin.from("shopping_suggestions").upsert(
        analysis.gaps.map((gap) => ({
          user_id: user.id,
          analysis_id: inserted.id,
          item: gap.item,
          why: gap.why,
          priority: gap.priority,
          occasion: gap.occasion,
        })),
        { onConflict: "user_id,item_key", ignoreDuplicates: true }
      );
    }

    return NextResponse.json({
      analysisId: inserted?.id ?? null,
      summary: analysis.summary,
      garments: analysis.garments,
      outfits: analysis.outfits,
      gaps: analysis.gaps,
      quota,
    });
  } catch (error) {
    await refundQuota();

    if (error instanceof OutfitAnalysisRefused) {
      return NextResponse.json(
        {
          error: "refused",
          message: {
            title: "Photos non analysables",
            body: "Envoie des photos de vêtements : penderie, tiroirs ouverts ou pièces posées à plat.",
          },
        },
        { status: 422 }
      );
    }

    console.error("[dressing] échec", error);
    return NextResponse.json(
      {
        error: "analysis_failed",
        message: {
          title: "Le scan n'a pas abouti",
          body: "Ton crédit n'a pas été décompté. Réessaie avec moins de photos.",
        },
      },
      { status: 502 }
    );
  }
}
