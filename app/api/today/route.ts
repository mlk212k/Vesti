import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchWeather, summarize } from "@/lib/weather";
import { keepOwnedPieces, suggestDailyOutfit, type WardrobePiece } from "@/lib/claude/suggest-daily";
import { hasFeature, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import type { Profile } from "@/types/db";

const bodySchema = z.object({
  occasion: z.enum(["travail", "rendez-vous", "soirée", "week-end", "sport"]),
});

export const maxDuration = 120;

/** Assez de pièces pour composer, pas assez pour faire exploser le prompt. */
const MAX_PIECES = 60;

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
    return NextResponse.json({ error: "invalid_occasion" }, { status: 400 });
  }
  const { occasion } = parsed.data;

  const { data: profile } = await supabase
    .from("profiles")
    .select(`${PLAN_COLUMNS}, latitude, longitude, city`)
    .eq("id", user.id)
    .single<PlanRow & Pick<Profile, "latitude" | "longitude" | "city">>();

  if (!profile || !hasFeature(planOf(profile), "shopping")) {
    return NextResponse.json(
      {
        error: "plan_required",
        message: {
          title: "Réservé au plan Styliste",
          body: "La tenue du jour selon la météo fait partie du plan Styliste.",
        },
      },
      { status: 402 }
    );
  }

  if (profile.latitude === null || profile.longitude === null) {
    return NextResponse.json({ error: "no_location" }, { status: 400 });
  }

  const day = new Date().toISOString().slice(0, 10);

  // Une suggestion par jour et par occasion : sans ce cache, rafraîchir la page
  // relancerait un appel au modèle à chaque fois.
  const { data: cached } = await supabase
    .from("daily_suggestions")
    .select("weather, outfit")
    .eq("user_id", user.id)
    .eq("day", day)
    .eq("occasion", occasion)
    .maybeSingle<{ weather: unknown; outfit: unknown }>();

  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  const weather = await fetchWeather(
    Number(profile.latitude),
    Number(profile.longitude),
    profile.city
  );

  if (!weather) {
    return NextResponse.json(
      {
        error: "weather_unavailable",
        message: {
          title: "Météo indisponible",
          body: "Impossible de récupérer la météo pour le moment. Réessaie plus tard.",
        },
      },
      { status: 503 }
    );
  }

  const { data: items } = await supabase
    .from("dressing_items")
    .select("id, category, label, color, material, season")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(MAX_PIECES);

  const pieces = (items ?? []) as WardrobePiece[];

  // Sans garde-robe, il n'y a rien à composer : on le dit plutôt que de faire
  // un appel au modèle qui inventerait des vêtements.
  if (pieces.length < 2) {
    return NextResponse.json(
      {
        error: "empty_wardrobe",
        weather: { summary: summarize(weather), ...weather },
        message: {
          title: "Ta garde-robe est encore vide",
          body: "Scanne ton dressing ou analyse quelques tenues, puis reviens.",
        },
      },
      { status: 409 }
    );
  }

  try {
    const { outfit, model } = await suggestDailyOutfit(pieces, weather, occasion);

    // Filtrage des identifiants : seule une tenue faite de vêtements réellement
    // possédés a du sens.
    const owned = keepOwnedPieces(outfit.item_ids, pieces);
    if (owned.length < 2) {
      return NextResponse.json(
        {
          error: "suggestion_failed",
          message: {
            title: "Pas de tenue proposée",
            body: "Réessaie dans un instant.",
          },
        },
        { status: 502 }
      );
    }

    const payload = {
      weather: { summary: summarize(weather), ...weather },
      outfit: { pieces: owned, advice: outfit.advice, missing: outfit.missing },
    };

    const admin = createAdminClient();
    await admin.from("daily_suggestions").upsert(
      {
        user_id: user.id,
        day,
        occasion,
        weather: payload.weather,
        outfit: payload.outfit,
        model,
      },
      { onConflict: "user_id,day,occasion" }
    );

    return NextResponse.json({ ...payload, cached: false });
  } catch (error) {
    console.error("[today] échec", error);
    return NextResponse.json(
      {
        error: "suggestion_failed",
        message: { title: "Pas de tenue proposée", body: "Réessaie dans un instant." },
      },
      { status: 502 }
    );
  }
}
