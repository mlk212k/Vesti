import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, hasFeature, type Plan } from "@/lib/plans";
import { computeScoreTrend } from "@/lib/stats";
import { QuotaMeter } from "@/components/dashboard/quota-meter";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TodayCard } from "@/components/dashboard/today-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/field";
import { Wordmark } from "@/components/brand/logo";
import type { QuotaStatus } from "@/types/db";

interface RecentAnalysis {
  id: string;
  score: number | null;
  occasion: string | null;
  created_at: string;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: quotaRows }, { data: analyses }, { data: locationRow }] =
    await Promise.all([
      supabase.rpc("get_quota_status"),
      supabase
        .from("analyses")
        .select("id, score, occasion, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("profiles")
        .select("latitude")
        .eq("id", user.id)
        .single<{ latitude: number | null }>(),
    ]);

  const quota = (quotaRows as QuotaStatus[] | null)?.[0];
  const plan: Plan = quota?.plan_code ?? "free";
  const definition = PLANS[plan];
  const recent = (analyses ?? []) as RecentAnalysis[];
  const trend = computeScoreTrend(recent);

  const exhausted = quota ? quota.remaining <= 0 : false;

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between gap-3">
        <Wordmark size={26} priority />
        <Link
          href="/compte"
          aria-label="Mon compte"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-border-soft bg-surface text-muted transition hover:border-accent hover:text-accent-strong"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          >
            <circle cx="12" cy="8" r="3.6" />
            <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
          </svg>
        </Link>
      </header>

      <h1 className="text-[2rem] font-extrabold leading-[1.05]">
        {recent.length === 0 ? "On commence ?" : "Content de te revoir"}
      </h1>

      <Card className="gap-4">
        <div className="flex items-baseline justify-between">
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-strong">
            {definition.name}
          </span>
          {quota && (
            <span className="text-xs text-muted">
              Renouvelé le {new Date(quota.period_end).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>

        {quota && (
          <QuotaMeter
            used={quota.used_count}
            limit={quota.limit_total}
            unlimited={definition.unlimitedMessaging}
          />
        )}

        {exhausted ? (
          <Link href="/billing">
            <Button>Passer en Pro pour continuer</Button>
          </Link>
        ) : (
          <Link href="/analyze">
            <Button>Analyser une tenue</Button>
          </Link>
        )}
      </Card>

      {hasFeature(plan, "shopping") && (
        <TodayCard hasLocation={locationRow?.latitude !== null} />
      )}

      {trend.points.length > 0 && (
        <section className="grid grid-cols-2 gap-3">
          <StatTile label="Analyses" value={recent.length} />
          <StatTile
            label="Score moyen"
            value={trend.average ?? "—"}
            suffix="/100"
            delta={trend.delta}
          />
        </section>
      )}

      {recent.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">Tes dernières tenues</h2>
            {hasFeature(plan, "history") && (
              <Link href="/history" className="text-xs font-medium underline underline-offset-2">
                Tout voir
              </Link>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {recent.slice(0, 3).map((analysis) => (
              <li
                key={analysis.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border-soft bg-surface px-4 py-3 shadow-[var(--shadow-card)]"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {analysis.occasion || "Tenue analysée"}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(analysis.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                </div>
                <span className="font-display flex-none text-xl font-extrabold tabular-nums">
                  {analysis.score ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasFeature(plan, "history") && recent.length > 0 && (
        <Card tone="soft">
          <h2 className="text-sm font-semibold">Garde une trace de tes progrès</h2>
          <p className="text-sm leading-relaxed text-muted">
            Le plan Pro conserve ta garde-robe, ton historique complet et
            l&apos;évolution de tes scores.
          </p>
          <Link href="/billing">
            <Button variant="secondary">Découvrir Pro</Button>
          </Link>
        </Card>
      )}
    </main>
  );
}
