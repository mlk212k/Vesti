import type { Metadata } from "next";
import { Avatar, EnTete, Stat } from "@/components/ui";
import { IconLogout } from "@/components/icons";
import { getSettings, requireUser } from "@/lib/auth";
import { formatCentsShort, formatRate } from "@/lib/money";
import { getMemberCards, getPeriodTotals } from "@/lib/queries";
import { resoudrePeriode } from "@/lib/periodes";
import { ROLE_LABEL } from "@/lib/types";
import { PasswordForm, ProfilForm } from "./profil-forms";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const settings = await getSettings();
  const { from, to } = resoudrePeriode("mois");

  const [cards, mois] = await Promise.all([
    getMemberCards(user.id),
    getPeriodTotals({ from, to, memberId: user.id }),
  ]);

  return (
    <div className="montee space-y-6">
      <EnTete surtitre="Mon compte" titre="Profil" />

      <div className="panneau-heros diagonale flex items-center gap-4 p-5">
        <Avatar nom={user.full_name} taille="lg" />
        <div className="min-w-0">
          <p className="titre truncate text-2xl">{user.full_name}</p>
          <p className="text-sm text-dim">{ROLE_LABEL[user.role]}</p>
          <p className="text-xs text-faint">
            Objectif : {user.daily_goal_override ?? settings.default_daily_goal}{" "}
            cartes · commission {formatRate(settings.commission_rate_bp)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="CA ce mois" valeur={formatCentsShort(mois.revenue_cents)} accent />
        <Stat label="Net ce mois" valeur={formatCentsShort(mois.net_cents)} />
        <Stat label="Cartes en main" valeur={cards.held} />
      </div>

      <ProfilForm user={user} />
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
