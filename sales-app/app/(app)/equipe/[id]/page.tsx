import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBack, IconChat } from "@/components/icons";
import {
  Avatar,
  Jauge,
  Section,
  Stat,
  StatutJournee,
  Vide,
} from "@/components/ui";
import { getSettings, isAdmin, requireRole } from "@/lib/auth";
import { formatDateLong, formatDateShort, formatDuration, formatTime } from "@/lib/format";
import { formatCents, formatCentsShort } from "@/lib/money";
import {
  getMemberCards,
  getTodayDay,
  listDays,
  listSales,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import {
  displayDayStatus,
  ROLE_LABEL,
  type CommissionPayout,
  type Profile,
} from "@/lib/types";
import { openDirectConversationAction } from "../../chat/actions";
import { CommissionPanel } from "./commission-panel";
import { ValiderJournee } from "./valider-journee";

export const metadata: Metadata = { title: "Profil membre" };

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await requireRole("admin", "manager");
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle<Profile>();

  if (!profile) notFound();

  const settings = await getSettings();
  const [day, cards, days, sales, payoutsRes] = await Promise.all([
    getTodayDay(profile.id),
    getMemberCards(profile.id),
    listDays({ memberId: profile.id, limit: 30 }),
    listSales({ memberId: profile.id, limit: 20 }),
    supabase
      .from("commission_payouts")
      .select("*")
      .eq("member_id", profile.id)
      .order("period_start", { ascending: false })
      .returns<CommissionPayout[]>(),
  ]);

  const caTotal = days.reduce((sum, d) => sum + d.revenue_cents, 0);
  const commissionTotale = days.reduce((sum, d) => sum + d.commission_cents, 0);
  const objectifsAtteints = days.filter((d) => d.goal_reached).length;

  const maintenant = new Date();
  const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
  const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);
  const iso = (date: Date) => date.toISOString().slice(0, 10);

  return (
    <div className="montee space-y-6">
      <div>
        <Link
          href="/equipe"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-faint hover:text-dim"
        >
          <IconBack className="h-4 w-4" />
          Équipe
        </Link>

        <div className="panneau p-5">
          <div className="flex items-center gap-4">
            <Avatar nom={profile.full_name} taille="lg" />
            <div className="min-w-0">
              <h1 className="titre truncate text-2xl">{profile.full_name}</h1>
              <p className="text-sm text-dim">
                {ROLE_LABEL[profile.role]}
                {profile.phone ? ` · ${profile.phone}` : ""}
              </p>
              {!profile.is_active ? (
                <span className="pastille pastille-vive mt-1.5">
                  Compte désactivé
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="panneau-creux p-3">
              <p className="surtitre">Cartes en main</p>
              <p className="chiffre mt-1 text-xl">{cards.held}</p>
            </div>
            <div className="panneau-creux p-3">
              <p className="surtitre">Vendues</p>
              <p className="chiffre mt-1 text-xl">{cards.sold}</p>
            </div>
            <div className="panneau-creux p-3">
              <p className="surtitre">Objectif</p>
              <p className="chiffre mt-1 text-xl">
                {profile.daily_goal_override ?? settings.default_daily_goal}
              </p>
            </div>
          </div>

          <form action={openDirectConversationAction} className="mt-4">
            <input type="hidden" name="member_id" value={profile.id} />
            <button type="submit" className="btn w-full py-2.5 text-sm">
              <IconChat className="h-4 w-4" />
              Envoyer un message
            </button>
          </form>
        </div>
      </div>

      <Section titre="Aujourd'hui">
        {!day ? (
          <Vide titre="Journée non commencée" />
        ) : (
          <div className="panneau p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-dim">
                Depuis {formatTime(day.started_at)} ·{" "}
                {formatDuration(day.duration_seconds)}
              </p>
              <StatutJournee statut={displayDayStatus(day)} />
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span className="chiffre w-14 shrink-0 text-sm text-dim">
                {day.cards_sold} / {day.goal_cards}
              </span>
              <div className="flex-1">
                <Jauge valeur={day.cards_sold} objectif={day.goal_cards} />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Stat label="CA" valeur={formatCentsShort(day.revenue_cents)} accent />
              <Stat
                label="Commission"
                valeur={formatCentsShort(day.commission_cents)}
              />
              <Stat label="Net" valeur={formatCentsShort(day.net_cents)} />
            </div>

            {day.status === "ended" ? (
              <div className="mt-3">
                <ValiderJournee
                  dayId={day.id}
                  objectifAtteint={day.goal_reached}
                  penaliteSuggereeCents={settings.missed_goal_penalty_cents}
                />
              </div>
            ) : null}
          </div>
        )}
      </Section>

      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="CA (30 j)"
          valeur={formatCentsShort(caTotal)}
          detail={`${days.length} journée(s)`}
          accent
        />
        <Stat
          label="Commission"
          valeur={formatCentsShort(commissionTotale)}
          detail="pour le chef"
        />
        <Stat
          label="Objectifs"
          valeur={`${objectifsAtteints}/${days.length}`}
          detail="atteints"
        />
      </div>

      <Section titre="Journées récentes">
        {days.length === 0 ? (
          <Vide titre="Aucune journée" />
        ) : (
          <ul className="space-y-2">
            {days.map((d) => (
              <li key={d.id} className="panneau p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {formatDateLong(d.work_date)}
                    </p>
                    <p className="text-xs text-faint">
                      {d.cards_sold} / {d.goal_cards} cartes ·{" "}
                      {formatCentsShort(d.revenue_cents)} ·{" "}
                      {formatDuration(d.duration_seconds)}
                    </p>
                  </div>
                  <StatutJournee statut={displayDayStatus(d)} />
                </div>

                {d.penalty_cents > 0 ? (
                  <p className="mt-2 text-xs text-braise">
                    Retenue : {formatCents(d.penalty_cents)}
                  </p>
                ) : null}

                {d.status === "ended" ? (
                  <div className="mt-3">
                    <ValiderJournee
                      dayId={d.id}
                      objectifAtteint={d.goal_reached}
                      penaliteSuggereeCents={settings.missed_goal_penalty_cents}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section titre="Dernières ventes">
        {sales.length === 0 ? (
          <Vide titre="Aucune vente" />
        ) : (
          <ul className="space-y-2">
            {sales.map((sale) => (
              <li key={sale.id}>
                <Link
                  href={`/ventes/${sale.id}`}
                  className="panneau flex items-center gap-3 p-3.5"
                >
                  <span className="chiffre w-8 text-center text-lg">
                    {sale.quantity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {sale.businesses?.name ?? "Vente directe"}
                    </p>
                    <p className="text-[11px] text-faint">
                      {formatDateShort(sale.sold_at)}
                    </p>
                  </div>
                  <span className="chiffre text-base">
                    {formatCentsShort(sale.amount_cents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {isAdmin(viewer.role) ? (
        <CommissionPanel
          memberId={profile.id}
          payouts={payoutsRes.data ?? []}
          debutMois={iso(debutMois)}
          finMois={iso(finMois)}
        />
      ) : null}
    </div>
  );
}
