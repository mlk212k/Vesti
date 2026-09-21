import type { Metadata } from "next";
import { EnTete, Section, Stat, Vide } from "@/components/ui";
import { isAdmin, requireRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import {
  getStockSummary,
  listMovements,
  listProfiles,
} from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { MOVEMENT_LABEL, type MemberCards } from "@/lib/types";
import { AdjustForm, AllocateForm, ReturnForm, RestockForm } from "./stock-forms";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage() {
  const user = await requireRole("admin", "manager");
  const supabase = await createClient();

  const [stock, profiles, movements, cardsRes] = await Promise.all([
    getStockSummary(),
    listProfiles({ activeOnly: true }),
    listMovements({ limit: 60 }),
    supabase.from("v_member_cards").select("*").returns<MemberCards[]>(),
  ]);

  const parMembre = (cardsRes.data ?? []).filter((row) => row.held !== 0 || row.allocated > 0);
  const noms = new Map(profiles.map((p) => [p.id, p.full_name]));
  const admin = isAdmin(user.role);

  return (
    <div className="space-y-6">
      <EnTete surtitre="Cartes NFC" titre="Stock" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Au dépôt"
          valeur={stock.in_warehouse}
          detail="disponibles à attribuer"
          accent
        />
        <Stat
          label="En circulation"
          valeur={stock.held_by_members}
          detail="dans les poches de l'équipe"
        />
        <Stat label="Vendues" valeur={stock.sold} detail="depuis le début" />
        <Stat
          label="Entrées totales"
          valeur={stock.restocked}
          detail={stock.lost > 0 ? `${stock.lost} perdue(s)` : "aucune perte"}
        />
      </div>

      <Section titre="Cartes par commercial">
        {parMembre.length === 0 ? (
          <Vide titre="Aucune carte attribuée">
            Utilise le formulaire d&apos;attribution ci-dessous.
          </Vide>
        ) : (
          <ul className="space-y-2">
            {parMembre.map((row) => (
              <li key={row.member_id} className="panneau flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.full_name}</p>
                  <p className="text-sm text-faint">
                    {row.allocated} attribuée{row.allocated > 1 ? "s" : ""} ·{" "}
                    {row.sold} vendue{row.sold > 1 ? "s" : ""} · {row.returned}{" "}
                    rendue{row.returned > 1 ? "s" : ""}
                    {row.lost > 0 ? ` · ${row.lost} perdue(s)` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="chiffre text-2xl">{row.held}</p>
                  <p className="text-sm text-faint">
                    en main
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AllocateForm membres={profiles} />
        <ReturnForm membres={profiles} />
        {admin ? <RestockForm /> : null}
        {admin ? <AdjustForm /> : null}
      </div>

      <Section titre="Historique des mouvements">
        {movements.length === 0 ? (
          <Vide titre="Aucun mouvement" />
        ) : (
          <ul className="space-y-1.5">
            {movements.map((movement) => {
              const signe = movement.warehouse_delta || movement.member_delta;
              return (
                <li
                  key={movement.id}
                  className="panneau-plat flex items-center gap-3 px-4 py-3"
                >
                  <span className="pastille shrink-0">
                    {MOVEMENT_LABEL[movement.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {movement.member_id
                        ? (noms.get(movement.member_id) ?? "Membre retiré")
                        : "Dépôt"}
                      {movement.note ? (
                        <span className="text-faint"> · {movement.note}</span>
                      ) : null}
                    </p>
                    <p className="text-sm text-faint">
                      {formatDateTime(movement.created_at)}
                    </p>
                  </div>
                  <span
                    className={`chiffre text-base ${
                      signe > 0 ? "text-accent" : "text-dim"
                    }`}
                  >
                    {signe > 0 ? "+" : ""}
                    {signe}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </div>
  );
}
