import type { Metadata } from "next";
import { EnTete } from "@/components/ui";
import { getSettings, requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Paramètres" };

export default async function SettingsPage() {
  await requireRole("admin");
  const settings = await getSettings();

  return (
    <div className="montee space-y-6">
      <EnTete surtitre="Règles de l'équipe" titre="Paramètres" />

      <SettingsForm settings={settings} />

      <p className="text-sm text-faint">
        Dernière modification : {formatDateTime(settings.updated_at)}. Chaque
        changement est enregistré dans le journal d&apos;audit avec l&apos;avant
        et l&apos;après.
      </p>
    </div>
  );
}
