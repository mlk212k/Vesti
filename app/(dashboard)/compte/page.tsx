import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, effectivePlan, type Plan } from "@/lib/plans";
import { DangerZone } from "@/components/account/danger-zone";
import { StyleCard } from "@/components/account/style-card";
import { LegalLinks } from "@/components/legal-links";
import { Button } from "@/components/ui/button";
import { getStyleStatus } from "@/lib/style.server";
import { env } from "@/lib/env";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export default async function ComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, gift_plan, gift_plan_until")
    .eq("id", user.id)
    .single<{ plan: Plan; gift_plan: Plan | null; gift_plan_until: string | null }>();

  // Le plan affiché est le plan EFFECTIF, cadeau compris : la colonne `plan`
  // appartient à Stripe et reste sur « free » pendant six mois offerts. Afficher
  // celle-là ferait passer le cadeau pour un cadeau qui n'a pas marché.
  const plan = effectivePlan(
    profile?.plan ?? "free",
    profile?.gift_plan ?? null,
    profile?.gift_plan_until ?? null
  );
  const style = await getStyleStatus();

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Mon compte</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </header>

      <section className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-border-soft bg-surface shadow-[var(--shadow-card)] p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Plan {PLANS[plan].name}</span>
          <Link href="/billing" className="text-xs underline underline-offset-2">
            Gérer
          </Link>
        </div>
        <form action={signOut}>
          <Button variant="secondary" type="submit">
            Se déconnecter
          </Button>
        </form>
      </section>

      {style && <StyleCard status={style} siteUrl={env.siteUrl} />}

      <DangerZone />

      <LegalLinks className="mt-2" />
    </main>
  );
}
