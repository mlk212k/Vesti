import type { Metadata } from "next";
import { Avatar, EnTete, Section, Vide } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { formatDateShort } from "@/lib/format";
import { listProfiles } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/types";
import { CreateMemberForm, EditMemberForm } from "./membre-forms";

export const metadata: Metadata = { title: "Membres" };

export default async function MembersPage() {
  const admin = await requireRole("admin");
  const profiles = await listProfiles();

  return (
    <div className="montee space-y-6">
      <EnTete surtitre="Comptes et accès" titre="Membres" />

      <CreateMemberForm />

      <Section titre={`${profiles.length} compte(s)`}>
        {profiles.length === 0 ? (
          <Vide titre="Aucun compte" />
        ) : (
          <ul className="space-y-2">
            {profiles.map((profile) => (
              <li key={profile.id} className="panneau p-4">
                <div className="flex items-center gap-3">
                  <Avatar nom={profile.full_name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{profile.full_name}</p>
                    <p className="text-xs text-faint">
                      {ROLE_LABEL[profile.role]}
                      {profile.daily_goal_override
                        ? ` · objectif ${profile.daily_goal_override}`
                        : ""}
                      {` · depuis le ${formatDateShort(profile.created_at)}`}
                    </p>
                  </div>
                  <span
                    className={
                      profile.is_active
                        ? "pastille pastille-succes"
                        : "pastille pastille-rouge"
                    }
                  >
                    {profile.is_active ? "Actif" : "Désactivé"}
                  </span>
                </div>

                <div className="mt-3">
                  <EditMemberForm
                    profile={profile}
                    estMoi={profile.id === admin.id}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
