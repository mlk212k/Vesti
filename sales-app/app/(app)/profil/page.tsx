import type { Metadata } from "next";
import { AvatarUploader } from "@/components/avatar-uploader";
import { BoutonSon } from "@/components/bouton-son";
import { IconLogout } from "@/components/icons";
import { PlanningEditor } from "@/components/planning-editor";
import { EnTete, Stat } from "@/components/ui";
import { getSettings, requireUser } from "@/lib/auth";
import { formatCentsShort, formatRate } from "@/lib/money";
import { resoudrePeriode } from "@/lib/periodes";
import { getMemberCards, getPeriodTotals, listCreneaux } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/types";
import { PasswordForm, ProfilForm } from "./profil-forms";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const settings = await getSettings();
  const { from, to } = resoudrePeriode("mois");

  const [cards, mois, creneaux] = await Promise.all([
    getMemberCards(user.id),
    getPeriodTotals({ from, to, memberId: user.id }),
    listCreneaux(user.id),
  ]);

  return (
    <div className="montee space-y-5">
      <EnTete surtitre="Mon compte" titre="Profil" />

      <div className="panneau">
        <AvatarUploader
          userId={user.id}
          nom={user.full_name}
          avatarActuel={user.avatar_url}
        />

        <div className="my-4" />

        <p className="titre text-3xl">{user.full_name}</p>
        <p className="mt-1 font-mono text-xs tracking-wider text-dim uppercase">
          {ROLE_LABEL[user.role]}
        </p>
        <p className="mt-1 font-mono text-[11px] text-faint">
          Objectif {user.daily_goal_override ?? settings.default_daily_goal}{" "}
          cartes · commission {formatRate(settings.commission_rate_bp)}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="CA ce mois" valeur={formatCentsShort(mois.revenue_cents)} accent />
        <Stat label="Net ce mois" valeur={formatCentsShort(mois.net_cents)} />
        <Stat label="En main" valeur={cards.held} />
      </div>

      <PlanningEditor creneaux={creneaux} />

      <ProfilForm user={user} />

      <BoutonSon />

      <PasswordForm />

      <form action="/logout" method="post">
        <button type="submit" className="btn btn-danger w-full py-3">
          <IconLogout className="h-4 w-4" />
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
