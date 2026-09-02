import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, type Plan } from "@/lib/plans";
import { DangerZone } from "@/components/account/danger-zone";
import { LegalLinks } from "@/components/legal-links";
import { Button } from "@/components/ui/button";

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
    .select("plan")
    .eq("id", user.id)
    .single<{ plan: Plan }>();

  const plan: Plan = profile?.plan ?? "free";

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

      <DangerZone />

      <LegalLinks className="mt-2" />
    </main>
  );
}
