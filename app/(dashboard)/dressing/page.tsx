import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  hasFeature,
  PLAN_COLUMNS,
  planOf,
  wardrobeLimit,
  type PlanRow,
} from "@/lib/plans";
import { OUTFITS_BUCKET } from "@/lib/supabase/storage";
import { WardrobeGrid, type WardrobeItem } from "@/components/dressing/wardrobe-grid";
import { WardrobeEmpty } from "@/components/dressing/wardrobe-empty";
import { WardrobeLock } from "@/components/dressing/wardrobe-lock";
import { WeatherPill } from "@/components/dressing/weather-pill";
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

  // ⚠️ Plus de mur de paiement à la place de l'onglet. Le plan Découverte
  // arrivait ici sur un écran « c'est à partir du plan Pro », sans avoir jamais
  // vu une seule de ses pièces — on lui demandait de payer pour une garde-robe
  // qu'il ne pouvait pas imaginer. Il voit maintenant la sienne, plafonnée, et
  // le cadenas ne ferme que la suite. Voir `wardrobeLimit()`.
  const limit = wardrobeLimit(plan);

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

  // La météo du jour est vendue avec le plan Styliste, comme la suggestion
  // qu'elle sert à produire.
  const showWeather = hasFeature(plan, "shopping");

  if (rows.length === 0)
    return <WardrobeEmpty weather={showWeather} canScan={limit === null} />;

  const counts = summarizeWardrobe(rows);
  const missing = missingEssentials(rows);

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ta garde-robe</h1>
        <p className="text-sm text-muted">
          {rows.length} pièce{rows.length > 1 ? "s" : ""} enregistrée
          {rows.length > 1 ? "s" : ""}
          {limit !== null && ` sur ${limit}`}
        </p>
      </header>

      {/* La grille montre ce qu'on possède ; elle ne dit pas où on en est.
          Cette ligne donne la répartition d'un coup d'œil, y compris les
          catégories à zéro — un « 0 chaussures » est une information, une
          ligne absente n'en est pas une. */}
      {showWeather && <WeatherPill hasWardrobe />}

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

      {limit !== null && <WardrobeLock count={rows.length} limit={limit} />}

      {/* Le scan multi-photos reste réservé aux plans payants — c'est lui qui
          coûte cher en analyse. Le plan Découverte remplit sa garde-robe par
          les analyses de tenue, qui sont déjà comprises dans son offre : on
          l'envoie donc là, et non vers une page qui le renverrait payer. */}
      {limit === null ? (
        <Link href="/dressing/scan">
          <Button variant="secondary">Ajouter des pièces</Button>
        </Link>
      ) : rows.length < limit ? (
        <Link href="/analyze">
          <Button variant="secondary">Analyser une tenue</Button>
        </Link>
      ) : null}
    </main>
  );
}
