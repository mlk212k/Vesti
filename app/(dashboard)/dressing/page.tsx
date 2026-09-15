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
import { missingEssentials } from "@/lib/wardrobe";
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

  const missing = missingEssentials(rows);

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] leading-[1.05]">Ta garde-robe</h1>
        <p className="text-sm text-muted">
          {rows.length} pièce{rows.length > 1 ? "s" : ""} enregistrée
          {rows.length > 1 ? "s" : ""}
          {limit !== null && ` sur ${limit}`}
        </p>
      </header>

      {showWeather && <WeatherPill hasWardrobe />}

      {/*
        ⚠️ LA RANGÉE DE PASTILLES A DISPARU.

        Elle comptait chaque catégorie — « 4 hauts », « 0 chaussures » — en
        pastilles violettes, juste au-dessus d'une grille de photos. Deux
        problèmes : elle disait en chiffres ce que la grille montre en images
        deux centimètres plus bas, et une ligne de taches colorées au-dessus de
        photos de vêtements détourne l'œil de ce qu'on est venu regarder. Le
        décompte total reste dans l'en-tête, où il suffit.

        Le manque, lui, reste — mais en une ligne de texte et un lien, plus
        dans un panneau encadré. C'est une remarque, pas un objet.
      */}
      {missing.length > 0 && (
        <p className="rule pt-5 text-sm leading-relaxed text-muted">
          Il te manque {missing.join(" et ")} pour composer une tenue complète.{" "}
          <Link
            href="/shopping"
            className="text-accent-strong underline underline-offset-4"
          >
            Voir quoi acheter
          </Link>
        </p>
      )}

      <WardrobeGrid items={rows} urls={Object.fromEntries(signedUrls)} />

      {limit !== null && <WardrobeLock count={rows.length} limit={limit} />}

      {/* Le scan multi-photos reste réservé aux plans payants — c'est lui qui
          coûte cher en analyse. Le plan Découverte remplit sa garde-robe par
          les analyses de tenue, qui sont déjà comprises dans son offre : on
          l'envoie donc là, et non vers une page qui le renverrait payer.

          ⚠️ Le bouton s'appelait « Ajouter des pièces », et c'était le goulot
          de tout le tunnel d'achat. Les suggestions de `/shopping` ne naissent
          QUE du scan de dressing (`app/api/dressing/route.ts`) : sans lui,
          l'onglet Acheter reste vide à vie. Or la garde-robe se remplit déjà
          toute seule par les analyses de tenue — l'abonné le plus actif avait
          53 pièces sans avoir jamais scanné. « Ajouter des pièces » ne lui
          promettait donc rien qu'il n'ait déjà : il n'avait aucune raison
          d'appuyer, et la fonction la plus chère du plan Styliste restait
          inatteignable. Le bouton annonce maintenant ce qu'il DÉBLOQUE, pas le
          travail qu'il demande. */}
      {limit === null ? (
        <div className="flex flex-col gap-2 panel p-5">
          <span className="text-sm font-semibold">Savoir ce qu&apos;il te manque</span>
          <p className="text-xs leading-relaxed text-muted">
            Photographie ta penderie : Vesti en tire l&apos;inventaire, repère
            les pièces qui manquent pour composer plus de tenues, et te les
            propose dans l&apos;onglet Acheter.
          </p>
          <Link href="/dressing/scan">
            <Button>Scanner ma penderie</Button>
          </Link>
        </div>
      ) : rows.length < limit ? (
        <Link href="/analyze">
          <Button variant="secondary">Analyser une tenue</Button>
        </Link>
      ) : null}
    </main>
  );
}
