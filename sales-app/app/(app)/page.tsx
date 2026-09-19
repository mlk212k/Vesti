import { getSettings, isStaff, requireUser } from "@/lib/auth";
import {
  getMemberCards,
  getStockSummary,
  getTeamToday,
  getTodayDay,
  listSales,
} from "@/lib/queries";
import { DashboardEquipe } from "./dashboard-equipe";
import { DashboardMembre } from "./dashboard-membre";

// Une seule route d'accueil, trois lectures possibles. Router vers /admin ou
// /membre selon le rôle obligerait à traiter le cas « je tape l'URL de
// l'autre » ; ici la question ne se pose pas.
export default async function DashboardPage() {
  const user = await requireUser();
  const settings = await getSettings();

  if (isStaff(user.role)) {
    const [rows, stock] = await Promise.all([getTeamToday(), getStockSummary()]);

    return (
      <DashboardEquipe
        rows={rows}
        settings={settings}
        stock={stock}
        estAdmin={user.role === "admin"}
        prenom={user.full_name.split(" ")[0] ?? user.full_name}
      />
    );
  }

  const day = await getTodayDay(user.id);
  const [cards, sales] = await Promise.all([
    getMemberCards(user.id),
    day ? listSales({ workDayId: day.id, limit: 10 }) : Promise.resolve([]),
  ]);

  return (
    <DashboardMembre
      user={user}
      day={day}
      cards={cards}
      settings={settings}
      sales={sales}
    />
  );
}
