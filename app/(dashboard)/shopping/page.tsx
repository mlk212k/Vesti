import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, hasFeature, requiredPlanFor, type Plan } from "@/lib/plans";
import { SuggestionCard, type SuggestionView } from "@/components/shopping/suggestion-card";
import { Button } from "@/components/ui/button";

export default async function ShoppingPage() {
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

  if (!hasFeature(plan, "shopping")) {
    const needed = requiredPlanFor("shopping");
    return (
      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Quoi acheter</h1>
        <p className="text-sm leading-relaxed text-muted">
          À partir des manques repérés dans ton dressing, Vesti te dit quoi
          acheter en priorité et cherche de vraies options en ligne. Inclus dans
          le plan {PLANS[needed].name}.
        </p>
        <Link href="/billing">
          <Button>Passer en {PLANS[needed].name}</Button>
        </Link>
      </main>
    );
  }

  const { data } = await supabase
    .from("shopping_suggestions")
    .select("id, item, why, priority, occasion, product_matches, searched_at")
    .eq("user_id", user.id)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(30);

  // Le tri par priorité se fait ici, pas en SQL : trier la colonne texte
  // classerait « basse » avant « haute » par ordre alphabétique.
  const PRIORITY_RANK: Record<SuggestionView["priority"], number> = {
    haute: 0,
    moyenne: 1,
    basse: 2,
  };

  const suggestions = ((data ?? []) as SuggestionView[])
    .slice()
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  if (suggestions.length === 0) {
    return (
      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Quoi acheter</h1>
        <p className="text-sm leading-relaxed text-muted">
          Scanne ton dressing : Vesti repère ce qui te manque pour compléter tes
          tenues, et c&apos;est ici que tu retrouveras la liste.
        </p>
        <Link href="/dressing/scan">
          <Button>Scanner mon dressing</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Quoi acheter</h1>
        <p className="text-sm leading-relaxed text-muted">
          Ce qui manque à ton dressing pour débloquer plus de tenues, du plus
          utile au moins pressé.
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.id} suggestion={suggestion} />
        ))}
      </ul>

      <p className="text-center text-xs leading-relaxed text-muted">
        Les liens proviennent d&apos;une recherche web réelle. Vesti ne touche
        aucune commission et ne propose rien qu&apos;il n&apos;a pas trouvé.
      </p>
    </main>
  );
}
