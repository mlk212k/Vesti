import Link from "next/link";
import { FirstNamePrompt } from "@/components/dashboard/first-name-prompt";
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
        .select("latitude, first_name")
        .eq("id", user.id)
        .single<{ latitude: number | null; first_name: string | null }>(),
    ]);

  const quota = (quotaRows as QuotaStatus[] | null)?.[0];
  const plan: Plan = quota?.plan_code ?? "free";
  const definition = PLANS[plan];
  const recent = (analyses ?? []) as RecentAnalysis[];
  const trend = computeScoreTrend(recent);

  const exhausted = quota ? quota.remaining <= 0 : false;

  const firstName = locationRow?.first_name?.trim() || null;
  const greeting = recent.length === 0
    ? firstName
      ? `On commence, ${firstName} ?`
      : "On commence ?"
    : firstName
      ? `Content de te revoir, ${firstName}`
      : "Content de te revoir";

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      {/* Le petit bonhomme en haut à droite menait ici aux réglages. Il a été
          retiré : les réglages sont désormais un onglet de la barre du bas, à
          portée de pouce. Deux portes vers le même endroit, dont une hors de
          portée en haut de l'écran, ne font pas gagner de temps — elles
          obligent à choisir. */}
      <header className="flex items-center">
        <Wordmark size={26} priority />
      </header>

      <h1 className="text-[2rem] font-extrabold leading-[1.05]">
        {greeting}
      </h1>

      {/* Posée aux comptes créés avant que l'onboarding demande le prénom :
          cette étape ne se rejoue pas, donc sans cette carte ils n'auraient
          jamais l'occasion de répondre. */}
      {!firstName && <FirstNamePrompt />}

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

          {/* ⚠️ Une seule boîte, des lignes séparées par un trait — et non trois
              cartes empilées, ce qu'elles étaient.

              Trois cartes disent « trois objets sans rapport ». Or ce sont trois
              lignes d'une même liste : c'est le filet qui le dit, en un pixel,
              là où trois bordures complètes hurlaient une séparation qui
              n'existe pas. `divide-y` ne trace le trait qu'ENTRE les lignes,
              donc jamais sous la dernière. */}
          <ul className="divide-y divide-border-soft overflow-hidden rounded-[var(--radius-card)] border border-border-soft bg-surface">
            {recent.slice(0, 3).map((analysis) => (
              <li
                key={analysis.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
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
                <span className="font-display flex-none text-lg font-bold tabular-nums">
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
