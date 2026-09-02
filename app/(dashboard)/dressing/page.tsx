import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasFeature, PLANS, requiredPlanFor, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import { OUTFITS_BUCKET } from "@/lib/supabase/storage";
import { WardrobeGrid, type WardrobeItem } from "@/components/dressing/wardrobe-grid";
import { WardrobeEmpty } from "@/components/dressing/wardrobe-empty";
import { missingEssentials, summarizeWardrobe } from "@/lib/wardrobe";
import { Button } from "@/components/ui/button";

export default async function DressingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(PLAN_COLUMNS)
    .eq("id", user.id)
    .single<PlanRow>();

  const plan = planOf(profile);

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

  if (rows.length === 0) return <WardrobeEmpty />;

  const counts = summarizeWardrobe(rows);
  const missing = missingEssentials(rows);

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ta garde-robe</h1>
        <p className="text-sm text-muted">
          {rows.length} pièce{rows.length > 1 ? "s" : ""} enregistrée
          {rows.length > 1 ? "s" : ""}
        </p>
      </header>

      {/* La grille montre ce qu'on possède ; elle ne dit pas où on en est.
          Cette ligne donne la répartition d'un coup d'œil, y compris les
          catégories à zéro — un « 0 chaussures » est une information, une
          ligne absente n'en est pas une. */}
      <section className="flex flex-wrap gap-2">
        {counts.map((category) => (
          <span
            key={category.value}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              category.count > 0
                ? "bg-accent-soft text-accent-strong"
                : "border border-border-soft text-muted"
            }`}
          >
            {category.count} {category.label.toLowerCase()}
          </span>
        ))}
      </section>

      {missing.length > 0 && (
        <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-border-soft bg-surface p-4">
          <span className="text-sm font-semibold">
            Il te manque {missing.join(" et ")}
          </span>
          <p className="text-xs leading-relaxed text-muted">
            Sans ça, Vesti ne peut pas composer de tenue complète à partir de ta
            penderie.
          </p>
          <Link href="/shopping" className="text-xs font-semibold text-accent-strong underline underline-offset-2">
            Voir quoi acheter
          </Link>
        </div>
      )}

      <WardrobeGrid items={rows} urls={Object.fromEntries(signedUrls)} />

      <Link href="/dressing/scan">
        <Button variant="secondary">Ajouter des pièces</Button>
      </Link>
    </main>
  );
}
