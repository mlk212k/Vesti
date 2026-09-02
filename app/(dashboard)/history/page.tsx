import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, hasFeature, requiredPlanFor, type Plan } from "@/lib/plans";
import { computeScoreTrend, computeTopItems } from "@/lib/stats";
import { ScoreTrendChart } from "@/components/dashboard/score-trend";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TopItems } from "@/components/dashboard/top-items";
import { Button } from "@/components/ui/button";

interface AnalysisRow {
  id: string;
  score: number | null;
  occasion: string | null;
  verdict: { verdict?: string } | null;
  created_at: string;
}

export default async function HistoryPage() {
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

  if (!hasFeature(plan, "history")) {
    const needed = requiredPlanFor("history");
    return (
      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ton historique</h1>
        <p className="text-sm leading-relaxed text-muted">
          Retrouve toutes tes tenues analysées et vois tes scores progresser au
          fil des semaines. Inclus à partir du plan {PLANS[needed].name}.
        </p>
        <Link href="/billing">
          <Button>Passer en {PLANS[needed].name}</Button>
        </Link>
      </main>
    );
  }

  const [{ data: analyses }, { data: items }] = await Promise.all([
    supabase
      .from("analyses")
      .select("id, score, occasion, verdict, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("dressing_items")
      .select("category, label")
      .eq("user_id", user.id)
      .limit(300),
  ]);

  const rows = (analyses ?? []) as AnalysisRow[];
  const trend = computeScoreTrend(rows);
  const topItems = computeTopItems((items ?? []) as { category: string; label: string }[]);

  if (rows.length === 0) {
    return (
      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ton historique</h1>
        <p className="text-sm text-muted">
          Il se remplira dès ta première tenue analysée.
        </p>
        <Link href="/analyze">
          <Button>Analyser une tenue</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-7 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ton historique</h1>
        <p className="text-sm text-muted">
          {rows.length} tenue{rows.length > 1 ? "s" : ""} analysée
          {rows.length > 1 ? "s" : ""}
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <StatTile
          label="Score moyen"
          value={trend.average ?? "—"}
          suffix="/100"
          delta={trend.delta}
        />
        <StatTile label="Meilleur score" value={trend.best ?? "—"} suffix="/100" />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Ta progression</h2>
        <ScoreTrendChart trend={trend} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Ce que tu portes le plus</h2>
        <TopItems items={topItems} />
      </section>

      {/* Cette liste est aussi la vue tabulaire du graphique ci-dessus : chaque
          point y figure avec sa date et sa valeur exacte. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Toutes tes analyses</h2>
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-1 rounded-2xl border border-border-soft bg-surface p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">
                  {row.occasion || "Tenue analysée"}
                </span>
                <span className="flex-none text-base font-bold tabular-nums">
                  {row.score ?? "—"}
                </span>
              </div>
              <span className="text-xs text-muted">
                {new Date(row.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              {row.verdict?.verdict && (
                <p className="line-clamp-2 text-sm leading-relaxed text-muted">
                  {row.verdict.verdict}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
