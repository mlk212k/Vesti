import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadImageForClaude } from "@/lib/supabase/storage";
import { analyzeOutfit, OutfitAnalysisRefused } from "@/lib/claude/analyze-outfit";
import { costMicros } from "@/lib/claude/pricing";
import { ANON_TRIAL_COOKIE, pathBelongsToTrial } from "@/lib/anon-trial";

const bodySchema = z.object({
  imagePath: z.string().min(3).max(200),
});

export const maxDuration = 120;

/**
 * L'analyse d'un essai sans compte.
 *
 * ── Ce qu'elle a en commun avec `/api/analyze`, et ce qui diffère ───────────
 *
 * Même modèle, même prompt, même verdict : ce que voit le visiteur est
 * exactement ce que voit un abonné, sinon l'essai ne prouve rien. Ce qui change
 * tient en trois points, tous liés à l'absence de compte :
 *
 *  - pas de profil. `analyzeOutfit` reçoit un contexte vide : ni morphologie,
 *    ni styles. Le verdict est donc un peu moins ajusté que celui d'un inscrit
 *    — c'est une raison de créer le compte, pas un défaut à cacher.
 *  - pas de quota ni de garde-robe. La place a déjà été réservée sous les
 *    plafonds à l'étape précédente ; il n'y a pas de crédit à consommer, et
 *    aucune pièce n'entre en garde-robe tant qu'il n'y a pas de propriétaire.
 *  - le verdict est écrit dans `anon_trials`, pas dans `analyses`. Il y attend
 *    l'inscription, qui le recopiera.
 *
 * ⚠️ L'ESSAI EST À USAGE UNIQUE, et c'est ici que ça se joue. On refuse si la
 * ligne porte déjà un score : sans ce test, rappeler la route avec le même
 * jeton relancerait le modèle autant de fois qu'on veut, et les plafonds ne
 * compteraient qu'une seule réservation pour des dizaines d'appels payés.
 */
export async function POST(request: Request) {
  const jar = await cookies();
  const trialId = jar.get(ANON_TRIAL_COOKIE)?.value;

  if (!trialId) {
    return NextResponse.json({ error: "no_trial" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { imagePath } = parsed.data;

  // Le chemin vient du navigateur. Sans cette vérification, on ferait analyser
  // — et surtout LIRE, puisque l'URL est signée par la clé de service — la
  // photo de n'importe quel compte à qui la demande.
  if (!pathBelongsToTrial(imagePath, trialId)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: trial } = await admin
    .from("anon_trials")
    .select("id, score, verdict, occasion, garments, image_path")
    .eq("id", trialId)
    .maybeSingle<{
      id: string;
      score: number | null;
      verdict: { verdict: string; strengths: string[]; improvements: string[] } | null;
      occasion: string | null;
      garments: unknown[];
      image_path: string | null;
    }>();

  if (!trial) {
    return NextResponse.json({ error: "no_trial" }, { status: 400 });
  }

  /*
    Déjà analysé : on rend le verdict tel quel.

    Ce n'est pas seulement un garde-fou anti-abus, c'est aussi ce qui rend
    l'essai rejouable. L'analyse dure une trentaine de secondes ; sur un réseau
    mobile faible, la connexion tombe avant la réponse alors que le serveur est
    allé au bout. Sans ce chemin, la personne verrait une erreur pour un travail
    réellement fait — et son unique essai serait consommé pour rien.
  */
  if (trial.score !== null && trial.verdict) {
    return NextResponse.json(renderTrial(trial));
  }

  try {
    const image = await loadImageForClaude(imagePath, "admin");

    const { analysis, usage, model } = await analyzeOutfit(image, {
      gender: null,
      height_cm: null,
      weight_kg: null,
      morphology: null,
      style_prefs: [],
    });

    const cost = costMicros(model, usage.inputTokens, usage.outputTokens);

    const { data: saved } = await admin
      .from("anon_trials")
      .update({
        image_path: imagePath,
        score: analysis.score,
        occasion: analysis.occasion,
        verdict: {
          verdict: analysis.verdict,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
        },
        garments: analysis.garments,
        cost_micros: cost,
      })
      // ⚠️ `is("score", null)` : si deux requêtes partent en même temps, la
      // seconde n'écrase pas le verdict de la première. Sans ce filtre, deux
      // appels concurrents produisent deux analyses payées pour un seul essai.
      .eq("id", trialId)
      .is("score", null)
      .select("id, score, verdict, occasion, garments, image_path")
      .maybeSingle();

    if (!saved) {
      // La course a été perdue : l'autre requête a déjà écrit. On relit plutôt
      // que d'échouer — le verdict existe, il est juste arrivé par l'autre voie.
      const { data: existing } = await admin
        .from("anon_trials")
        .select("id, score, verdict, occasion, garments, image_path")
        .eq("id", trialId)
        .maybeSingle();

      if (existing?.score !== null && existing?.verdict) {
        return NextResponse.json(renderTrial(existing));
      }

      return NextResponse.json({ error: "analysis_failed" }, { status: 502 });
    }

    return NextResponse.json(renderTrial(saved));
  } catch (error) {
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

    console.error("[essai] échec", error);
    return NextResponse.json(
      {
        error: "analysis_failed",
        message: {
          title: "L'analyse n'a pas abouti",
          body: "Réessaie dans un instant.",
        },
      },
      { status: 502 }
    );
  }
}

/**
 * Met le verdict à la forme que le client attend.
 *
 * ⚠️ `savedToWardrobe: false` et `productsPending: false` ne sont pas des
 * oublis : sans compte il n'y a pas de garde-robe à remplir ni de plan qui paie
 * la recherche de liens. Les annoncer à `true` ferait promettre à la carte de
 * verdict des choses qui n'arriveront jamais.
 */
function renderTrial(trial: {
  score: number | null;
  verdict: { verdict: string; strengths: string[]; improvements: string[] } | null;
  occasion: string | null;
  garments: unknown;
}) {
  return {
    analysisId: null,
    score: trial.score,
    verdict: trial.verdict?.verdict ?? "",
    strengths: trial.verdict?.strengths ?? [],
    improvements: trial.verdict?.improvements ?? [],
    occasion: trial.occasion,
    garments: (Array.isArray(trial.garments) ? trial.garments : []).map((g) => ({
      ...(g as Record<string, unknown>),
      product_matches: [],
    })),
    savedToWardrobe: false,
    wardrobeFull: false,
    productsPending: false,
  };
}
