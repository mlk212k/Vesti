import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlanPicker } from "@/components/billing/plan-picker";
import { LegalLinks } from "@/components/legal-links";
import { PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";

export default async function BillingPage(props: PageProps<"/billing">) {
  const params = await props.searchParams;
  const checkout = typeof params.checkout === "string" ? params.checkout : undefined;

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

  const currentPlan = planOf(profile);

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Ton abonnement</h1>
        <p className="text-sm text-muted">Sans engagement, résiliable à tout moment.</p>
      </header>

      {checkout === "success" && (
        <p className="rounded-2xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          Paiement confirmé. Si ton plan n&apos;apparaît pas tout de suite,
          rafraîchis dans quelques secondes.
        </p>
      )}

      {checkout === "cancelled" && (
        <p className="rounded-2xl border border-border-soft bg-surface px-4 py-3 text-sm text-muted">
          Paiement annulé, rien n&apos;a été débité.
        </p>
      )}

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
