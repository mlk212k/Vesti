import { requireRole } from "@/lib/auth";
import { TrainingForm } from "./training-form";

export default async function TrainingPlannerPage() {
  await requireRole("admin", "coach");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Préparer un entraînement</h1>
        <p className="text-sm text-muted">
          Décris la séance, l&apos;IA te propose un déroulé détaillé.
        </p>
      </header>

      <TrainingForm />
    </div>
  );
}
