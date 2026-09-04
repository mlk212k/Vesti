import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BackLink } from "@/components/nav/back-link";
import { ProfileForm } from "@/components/settings/profile-form";
import type { Gender, Morphology } from "@/lib/profile";

interface ProfileRow {
  first_name: string | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  morphology: string | null;
  style_prefs: string[] | null;
}

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("first_name, gender, height_cm, weight_kg, morphology, style_prefs")
    .eq("id", user.id)
    .single<ProfileRow>();

  return (
    <main className="flex flex-1 flex-col gap-6 px-5 py-8">
      <div className="flex flex-col gap-3">
        <BackLink href="/compte" label="Paramètres" />
        <div className="flex flex-col gap-1">
          <h1 className="text-[1.9rem] font-extrabold leading-[1.05]">
            Profil et morphologie
          </h1>
          <p className="text-sm leading-relaxed text-muted">
            C&apos;est ce que le styliste lit avant de juger une tenue. Tout est
            facultatif — mais plus il en sait, plus le conseil est juste.
          </p>
        </div>
      </div>

      <ProfileForm
        initial={{
          firstName: data?.first_name ?? "",
          gender: (data?.gender as Gender | null) ?? null,
          heightCm: data?.height_cm ?? null,
          weightKg: data?.weight_kg ?? null,
          morphology: (data?.morphology as Morphology | null) ?? null,
          // `style_prefs` est un jsonb non nul en base, mais une lecture peut
          // rendre `null` si la ligne n'existe pas encore : on ne fait pas
          // confiance au type déclaré pour ce qui traverse le réseau.
          stylePrefs: Array.isArray(data?.style_prefs) ? data.style_prefs : [],
        }}
      />
    </main>
  );
}
