import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanPicker } from "@/components/billing/plan-picker";
import { CurrentPlan } from "@/components/billing/current-plan";
import type { QuotaStatus } from "@/types/db";
import { LegalLinks } from "@/components/legal-links";
import { PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import { BackLink } from "@/components/nav/back-link";

export default async function BillingPage(props: PageProps<"/billing">) {
  const params = await props.searchParams;
  const checkout = typeof params.checkout === "string" ? params.checkout : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: quotaRows }] = await Promise.all([
    supabase.from("profiles").select(PLAN_COLUMNS).eq("id", user.id).single<PlanRow>(),
    supabase.rpc("get_quota_status"),
  ]);

  const currentPlan = planOf(profile);
  const quota = (quotaRows as QuotaStatus[] | null)?.[0];

  // Un cadeau actif est exactement ce qui fait diverger le plan EFFECTIF de la
  // colonne que pilote Stripe. On lit donc cette divergence plutôt que de
  // comparer des dates : c'est Postgres qui a déjà tranché, avec son horloge,
  // et lire l'heure ici rendrait le rendu impur.
  const giftUntil =
    quota && quota.plan_code !== (profile?.plan ?? "free")
      ? (profile?.gift_plan_until ?? null)
      : null;

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 py-8">
      {/* Cette page n'a pas d'onglet : on y arrive depuis les paramètres ou
          depuis un bouton de l'accueil. Sans retour explicite, la seule sortie
          serait la barre du bas — qui ramène à un onglet, pas à l'endroit d'où
          l'on vient. Dans une app installée, il n'y a pas non plus de flèche de
          navigateur pour rattraper le coup. */}
      <div className="flex flex-col gap-3">
        <BackLink href="/compte" label="Paramètres" />
        <header className="flex flex-col gap-1">
          <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ton abonnement</h1>
          <p className="text-sm text-muted">Sans engagement, résiliable à tout moment.</p>
        </header>
      </div>

      {checkout === "success" && (
        <p className="rounded-[var(--radius-control)] border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          Paiement confirmé. Si ton plan n&apos;apparaît pas tout de suite,
          rafraîchis dans quelques secondes.
        </p>
      )}

      {checkout === "cancelled" && (
        <p className="rounded-[var(--radius-control)] border border-border-soft bg-surface px-4 py-3 text-sm text-muted">
          Paiement annulé, rien n&apos;a été débité.
        </p>
      )}

      <CurrentPlan
        plan={currentPlan}
        used={quota?.used_count ?? 0}
        limit={quota?.limit_total ?? 0}
        periodEnd={quota?.period_end ?? null}
        giftUntil={giftUntil}
      />

      <h2 className="text-sm font-semibold">
        {currentPlan === "free" ? "Passer à la vitesse supérieure" : "Toutes les formules"}
      </h2>

      <PlanPicker currentPlan={currentPlan} />

      {/* Obligation d'information précontractuelle : les CGV doivent être
          accessibles avant le paiement, pas seulement après. */}
      <p className="text-center text-xs leading-relaxed text-muted">
        En souscrivant, tu acceptes les CGV. Abonnement mensuel sans engagement,
        résiliable à tout moment, avec 14 jours de rétractation.
      </p>
      <LegalLinks />
    </main>
  );
}
