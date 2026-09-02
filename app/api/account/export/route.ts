import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OUTFITS_BUCKET } from "@/lib/supabase/storage";
import {
  buildExport,
  collectStoragePaths,
  type AnalysisExport,
  type ItemExport,
} from "@/lib/account";

/** Une heure : assez pour tout télécharger, pas assez pour traîner. */
const PHOTO_URL_TTL = 3600;

/**
 * Export des données personnelles (RGPD art. 15 et 20).
 *
 * Toutes les lectures passent par le client utilisateur : la RLS garantit
 * qu'un export ne peut jamais contenir les données de quelqu'un d'autre, même
 * en cas d'erreur de filtre.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const [profil, analyses, items, suggestions, subscriptions] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("analyses").select("*").eq("user_id", user.id),
    supabase.from("dressing_items").select("*").eq("user_id", user.id),
    supabase.from("shopping_suggestions").select("*").eq("user_id", user.id),
    supabase.from("subscriptions").select("*").eq("user_id", user.id),
  ]);

  const analysisRows = (analyses.data ?? []) as AnalysisExport[];
  const itemRows = (items.data ?? []) as ItemExport[];
  const paths = collectStoragePaths(analysisRows, itemRows);

  // Les photos ne sont pas encodées dans le JSON — ce serait des dizaines de Mo.
  // On fournit des liens de téléchargement temporaires.
  const photoUrls: { chemin: string; url_temporaire: string | null }[] = [];
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(OUTFITS_BUCKET)
      .createSignedUrls(paths, PHOTO_URL_TTL);

    for (const path of paths) {
      const match = signed?.find((entry) => entry.path === path);
      photoUrls.push({ chemin: path, url_temporaire: match?.signedUrl ?? null });
    }
  }

  const payload = buildExport({
    userId: user.id,
    email: user.email ?? null,
    profil: (profil.data ?? {}) as Record<string, unknown>,
    analyses: analysisRows,
    items: itemRows,
    suggestions: suggestions.data ?? [],
    subscriptions: subscriptions.data ?? [],
    photoUrls,
    now: new Date(),
  });

  const filename = `vesti-donnees-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Un export de données personnelles n'a rien à faire dans un cache.
      "Cache-Control": "no-store",
    },
  });
}
