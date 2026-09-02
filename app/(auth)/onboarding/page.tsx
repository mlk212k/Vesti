import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { REFERRAL_COOKIE } from "@/proxy";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts garde déjà cette route ; ceci couvre le cas où la session expire
  // entre le passage du proxy et le rendu.
  if (!user) redirect("/login?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .single();

  if (profile?.onboarded_at) redirect("/dashboard");

  // Code capté à l'arrivée depuis un lien partenaire (?ref=...).
  const cookieStore = await cookies();
  const initialReferralCode = cookieStore.get(REFERRAL_COOKIE)?.value ?? "";

  return (
    <main className="flex flex-1 flex-col gap-7 px-6 py-10">
      <OnboardingForm initialReferralCode={initialReferralCode.toUpperCase()} />
    </main>
  );
}
