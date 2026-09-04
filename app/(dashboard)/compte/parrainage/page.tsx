import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/nav/back-link";
import { StyleCard } from "@/components/account/style-card";
import { getStyleStatus } from "@/lib/style.server";
import { env } from "@/lib/env";

export default async function ParrainagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const style = await getStyleStatus();

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      <div className="flex flex-col gap-3">
        <BackLink href="/compte" label="Paramètres" />
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">
            Parrainage
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            Ton code, tes filleuls et ce qu&apos;ils t&apos;ont rapporté.
          </p>
        </div>
      </div>

      {style ? (
        <StyleCard status={style} siteUrl={env.siteUrl} />
      ) : (
        // Le solde se lit par une fonction SQL : si elle échoue, mieux vaut le
        // dire que d'afficher un zéro qui ferait croire à une perte de gains.
        <p className="rounded-[var(--radius-card)] border border-border-soft bg-surface p-4 text-sm leading-relaxed text-muted">
          Impossible de charger ton parrainage pour le moment. Reviens dans un
          instant — rien n&apos;est perdu, le compte est tenu côté serveur.
        </p>
      )}
    </main>
  );
}
