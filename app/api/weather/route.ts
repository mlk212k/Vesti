import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchWeather, describeCode, summarize } from "@/lib/weather";
import { hasFeature, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import type { Profile } from "@/types/db";

/**
 * La météo seule, sans tenue.
 *
 * Séparée de `/api/today` parce que les deux n'ont pas le même prix. La météo
 * est un appel gratuit à Open-Meteo : elle peut s'afficher dès l'ouverture de
 * la page. La tenue, elle, coûte un appel au modèle, et ne part donc que sur un
 * geste explicite.
 *
 * Les mélanger obligerait à choisir entre deux mauvaises options : afficher la
 * température au prix d'une suggestion que personne n'a demandée, ou cacher la
 * température derrière un bouton.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(`${PLAN_COLUMNS}, latitude, longitude, city`)
    .eq("id", user.id)
    .single<PlanRow & Pick<Profile, "latitude" | "longitude" | "city">>();

  if (!profile || !hasFeature(planOf(profile), "shopping")) {
    return NextResponse.json({ error: "plan_required" }, { status: 402 });
  }

  // Position jamais demandée, ou refusée : ce n'est pas une erreur, c'est un
  // état que la pastille sait afficher.
  if (profile.latitude === null || profile.longitude === null) {
    return NextResponse.json({ error: "no_location" }, { status: 409 });
  }

  const weather = await fetchWeather(
    Number(profile.latitude),
    Number(profile.longitude),
    profile.city
  );

  if (!weather) {
    return NextResponse.json({ error: "weather_unavailable" }, { status: 503 });
  }

  return NextResponse.json({
    ...weather,
    summary: summarize(weather),
    ...describeCode(weather.code),
  });
}
