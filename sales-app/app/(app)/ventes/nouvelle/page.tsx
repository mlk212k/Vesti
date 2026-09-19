import type { Metadata } from "next";
import Link from "next/link";
import { getSettings, requireUser } from "@/lib/auth";
import { getMemberCards, getOpenDay, listBusinesses } from "@/lib/queries";
import { IconBack } from "@/components/icons";
import { SaleForm } from "./sale-form";

export const metadata: Metadata = { title: "Nouvelle vente" };

export default async function NewSalePage() {
  const user = await requireUser();
  const [settings, day, cards, businesses] = await Promise.all([
    getSettings(),
    getOpenDay(user.id),
    getMemberCards(user.id),
    listBusinesses({ memberId: user.id, limit: 200 }),
  ]);

  return (
    <div className="montee">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-faint hover:text-dim"
      >
        <IconBack className="h-4 w-4" />
        Retour
      </Link>

      <h1 className="titre mb-1 text-3xl">Nouvelle vente</h1>
      <p className="mb-6 text-sm text-faint">
        Le montant est recalculé par le serveur à l&apos;enregistrement.
      </p>

      {/* Sans journée ouverte, la vente serait refusée par la base
          (`NO_OPEN_DAY`). Autant le dire avant de remplir le formulaire. */}
      {!day ? (
        <div className="panneau space-y-3 p-5">
          <p className="titre text-lg">Ta journée n&apos;est pas commencée</p>
          <p className="text-sm text-dim">
            Une vente est toujours rattachée à une journée de travail : c&apos;est
            ce qui permet de calculer ton objectif, ton temps et ton net.
          </p>
          <Link href="/" className="btn btn-primaire w-full py-3">
            Aller commencer ma journée
          </Link>
        </div>
      ) : (
        <SaleForm
          businesses={businesses}
          defaultPriceCents={settings.default_card_price_cents}
          commissionRateBp={settings.commission_rate_bp}
          cardsHeld={cards.held}
          userId={user.id}
        />
      )}
    </div>
  );
}
