import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import {
  computeOverview,
  computeUsage,
  type AnalysisRow,
  type ProfileRow,
} from "@/lib/admin-stats";
import { PLANS, PLAN_ORDER } from "@/lib/plans";
import { StatTile } from "@/components/dashboard/stat-tile";
import type { ReferralStats } from "@/types/db";

export const metadata: Metadata = { title: "Admin" };

/** Ce tableau de bord doit refléter l'état réel, jamais une version en cache. */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Deuxième vérification, indépendante du layout : cette page lit ensuite avec
  // le service_role, qui ignore la RLS. Un contrôle unique en amont serait un
  // point de défaillance trop coûteux.
  if (!isAdminEmail(user?.email)) {
    notFound();
  }

  const admin = createAdminClient();
  const now = new Date();

  const [{ data: profiles }, { data: analyses }, { data: referrals }] = await Promise.all([
    admin.from("profiles").select("plan, created_at, referral_code"),
    admin.from("analyses").select("created_at, input_tokens, output_tokens"),
    admin
      .from("referral_stats")
      .select("code, partner_name, channel, active, signups, paying_customers, signups_30d, last_signup_at"),
  ]);

  const overview = computeOverview((profiles ?? []) as ProfileRow[], now);
  const usage = computeUsage((analyses ?? []) as AnalysisRow[], now);
  const codes = ((referrals ?? []) as ReferralStats[])
    .slice()
    .sort((a, b) => b.signups - a.signups);

  const euro = (value: number) =>
    value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <main className="flex flex-1 flex-col gap-7 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Admin</h1>
        <p className="text-sm text-muted">{user?.email}</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Activité</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Inscrits" value={overview.signups} />
          <StatTile label="Dont 30 derniers jours" value={overview.signups30d} />
          <StatTile label="Clients payants" value={overview.payingCustomers} />
          <StatTile
            label="Conversion"
            value={overview.conversionRate.toLocaleString("fr-FR")}
            suffix="%"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Revenu</h2>
        <div className="rounded-[var(--radius-card)] border border-border-soft bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted">MRR estimé</span>
            <span className="font-display text-[28px] font-extrabold tabular-nums">{euro(overview.mrr)} €</span>
          </div>
          <ul className="mt-3 flex flex-col gap-1 border-t border-border pt-3">
            {PLAN_ORDER.map((plan) => (
              <li key={plan} className="flex justify-between text-sm">
                <span className="text-muted">{PLANS[plan].name}</span>
                <span className="tabular-nums">{overview.byPlan[plan]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Coût du modèle</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Analyses" value={usage.analyses} />
          <StatTile label="Dont 30 jours" value={usage.analyses30d} />
          <StatTile
            label="Coût cumulé"
            value={usage.estimatedCost.toLocaleString("fr-FR")}
            suffix="$"
          />
          <StatTile
            label="Par analyse"
            value={usage.costPerAnalysis.toLocaleString("fr-FR")}
            suffix="$"
          />
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Estimation calculée sur les tokens enregistrés à chaque analyse, aux
          tarifs Opus 5. C&apos;est l&apos;indicateur qui dit si la marge tient :
          compare le coût mensuel par client payant au prix de son abonnement.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Codes partenaires</h2>
        {codes.length === 0 ? (
          <p className="text-sm text-muted">
            Aucun code enregistré. Insère-les dans la table{" "}
            <code>referral_codes</code>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 pr-3 font-medium">Code</th>
                  <th className="pb-2 pr-3 font-medium">Partenaire</th>
                  <th className="pb-2 pr-3 text-right font-medium">Inscrits</th>
                  <th className="pb-2 text-right font-medium">Payants</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((row) => (
                  <tr key={row.code} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-medium">
                      {row.code}
                      {!row.active && (
                        <span className="ml-1 text-xs text-muted">(inactif)</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-muted">{row.partner_name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.signups}</td>
                    <td className="py-2 text-right tabular-nums">{row.paying_customers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
