import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PLANS, hasFeature, requiredPlanFor, PLAN_COLUMNS, planOf, type PlanRow } from "@/lib/plans";
import { DressingScanner } from "@/components/dressing/dressing-scanner";
import { Button } from "@/components/ui/button";

export default async function DressingScanPage() {
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

  // La route API refuse de toute façon (le verrou de plan est dans le RPC) ;
  // ici on évite juste à l'utilisateur d'uploader pour rien.
  if (!hasFeature(plan, "dressing")) {
    const needed = requiredPlanFor("dressing");
    return (
      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-10 text-center">
        <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">Scanne ton dressing</h1>
        <p className="text-sm leading-relaxed text-muted">
          Photographie ta penderie : Vesti fait l&apos;inventaire, compose des
          tenues avec ce que tu as déjà, et repère ce qui te manque. Inclus à
          partir du plan {PLANS[needed].name}.
        </p>
        <Link href="/billing">
          <Button>Passer en {PLANS[needed].name}</Button>
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-5 py-8">
      <DressingScanner />
    </main>
  );
}
