import type { Metadata } from "next";
import { EnTete, Section, Stat, Vide } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getMemberCards, listMovements } from "@/lib/queries";
import { MOVEMENT_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "Mes cartes" };

// Vue commercial de son propre stock. La RLS ne renvoie que ses mouvements :
// même en forçant un autre identifiant, il n'y aurait rien à lire.
export default async function MyCardsPage() {
  const user = await requireUser();
  const [cards, movements] = await Promise.all([
    getMemberCards(user.id),
    listMovements({ memberId: user.id, limit: 50 }),
  ]);

  return (
    <div className="montee space-y-6">
      <EnTete surtitre="Ce que j'ai en main" titre="Mes cartes" />

      <div className="ticket p-6 text-center">
        <p className="surtitre">Cartes en main</p>
        <p className="chiffre mt-2 text-7xl">{cards.held}</p>
        <p className="mt-2 text-sm text-dim">
          sur {cards.allocated} attribuée{cards.allocated > 1 ? "s" : ""} depuis
          le début
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Vendues" valeur={cards.sold} accent />
        <Stat label="Rendues" valeur={cards.returned} />
        <Stat label="Perdues" valeur={cards.lost} />
      </div>

      <Section titre="Historique">
        {movements.length === 0 ? (
          <Vide titre="Aucun mouvement">
            Le chef ne t&apos;a pas encore attribué de cartes.
          </Vide>
        ) : (
          <ul className="space-y-1.5">
            {movements.map((movement) => (
              <li
                key={movement.id}
                className="panneau-plat flex items-center gap-3 px-4 py-3"
              >
                <span className="pastille shrink-0">
                  {MOVEMENT_LABEL[movement.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-faint">
                    {formatDateTime(movement.created_at)}
                    {movement.note ? ` · ${movement.note}` : ""}
                  </p>
                </div>
                <span
                  className={`chiffre text-base ${
                    movement.member_delta > 0 ? "text-succes" : "text-dim"
                  }`}
                >
                  {movement.member_delta > 0 ? "+" : ""}
                  {movement.member_delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
