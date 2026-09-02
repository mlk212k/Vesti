import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasFeature, PLANS, requiredPlanFor } from "@/lib/plans";
import { OUTFITS_BUCKET } from "@/lib/supabase/storage";
import { WardrobeGrid, type WardrobeItem } from "@/components/dressing/wardrobe-grid";
import { Button } from "@/components/ui/button";
import type { Plan } from "@/types/db";

export default async function DressingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single<{ plan: Plan }>();

  const plan: Plan = profile?.plan ?? "free";

  if (!hasFeature(plan, "dressing")) {
    const needed = requiredPlanFor("dressing");
    return (
      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ta garde-robe</h1>
        <p className="text-sm leading-relaxed text-muted">
          Chaque tenue analysée vient remplir ta garde-robe : chaque pièce y est
          fichée, chaussures comprises. C&apos;est inclus à partir du plan{" "}
          {PLANS[needed].name}.
        </p>
        <Link href="/billing">
          <Button>Passer en {PLANS[needed].name}</Button>
        </Link>
      </main>
    );
  }

  const { data: items } = await supabase
    .from("dressing_items")
    .select(
      "id, category, label, color, material, brand, brand_confidence, crop_box, source_image_path, product_matches, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (items ?? []) as WardrobeItem[];

  // Une URL signée par photo source (et non par pièce) : plusieurs pièces
  // partagent la même photo d'origine.
  const uniquePaths = [
    ...new Set(rows.map((item) => item.source_image_path).filter(Boolean)),
  ] as string[];

  const signedUrls = new Map<string, string>();
  if (uniquePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(OUTFITS_BUCKET)
      .createSignedUrls(uniquePaths, 3600);
    for (const entry of signed ?? []) {
      if (entry.path && entry.signedUrl) signedUrls.set(entry.path, entry.signedUrl);
    }
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ta garde-robe</h1>
        <p className="text-sm text-muted">
          {rows.length === 0
            ? "Scanne ta penderie, ou laisse-la se remplir à chaque tenue analysée."
            : `${rows.length} pièce${rows.length > 1 ? "s" : ""} enregistrée${rows.length > 1 ? "s" : ""}`}
        </p>
      </header>

      <Link href="/dressing/scan">
        <Button variant={rows.length === 0 ? "primary" : "secondary"}>
          Scanner mon dressing en photos
        </Button>
      </Link>

      {rows.length === 0 ? (
        <p className="text-center text-sm text-muted">
          Ou analyse une tenue :{" "}
          <Link href="/analyze" className="underline underline-offset-2">
            ses pièces viendront ici
          </Link>
          .
        </p>
      ) : (
        <WardrobeGrid items={rows} urls={Object.fromEntries(signedUrls)} />
      )}
    </main>
  );
}
