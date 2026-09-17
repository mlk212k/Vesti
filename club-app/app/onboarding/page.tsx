import { requireUser } from "@/lib/auth";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const user = await requireUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <OnboardingWizard
          userId={user.id}
          fullName={user.full_name}
          initialCategory={user.category}
        />
      </div>
    </main>
  );
}
