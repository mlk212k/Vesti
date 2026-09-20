import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBack, IconPhone } from "@/components/icons";
import { Section, Vide } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateShort, formatTime } from "@/lib/format";
import { formatCentsShort } from "@/lib/money";
import { getBusiness, listSales } from "@/lib/queries";
import { signedProofUrl } from "@/lib/storage";
import { BUSINESS_STATUS_LABEL } from "@/lib/types";
import { BusinessForm } from "../business-form";
import { updateBusinessAction } from "../actions";
import { BoutonSupprimer } from "./bouton-supprimer";

export const metadata: Metadata = { title: "Commerce" };

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  // Idem que pour une vente : si la RLS ne rend pas la ligne, c'est un 404.
  // Un commercial qui tape l'id d'une fiche d'un collègue ne voit rien.
  const business = await getBusiness(id);
  if (!business) notFound();

  const [sales, photo] = await Promise.all([
    listSales({ businessId: business.id, limit: 100 }),
    signedProofUrl(business.photo_url),
  ]);

  const total = sales.reduce((sum, sale) => sum + sale.amount_cents, 0);
  const cartes = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const proprietaire = business.member_id === user.id;

  return (
    <div className="montee space-y-5">
      <div>
        <Link
          href="/commerces"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-faint hover:text-dim"
        >
          <IconBack className="h-4 w-4" />
          Commerces
        </Link>

        <div className="ticket p-5">
          <span className="pastille">{BUSINESS_STATUS_LABEL[business.status]}</span>
          <h1 className="titre mt-3 text-3xl">{business.name}</h1>
          <p className="mt-1 text-sm text-dim">
            {[business.category, business.address, business.city]
              .filter(Boolean)
              .join(" · ") || "Aucune adresse renseignée"}
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="panneau-creux p-3">
              <p className="surtitre">Cartes</p>
              <p className="chiffre mt-1 text-xl">{cartes}</p>
            </div>
            <div className="panneau-creux p-3">
              <p className="surtitre">CA</p>
              <p className="chiffre mt-1 text-xl">{formatCentsShort(total)}</p>
            </div>
            <div className="panneau-creux p-3">
              <p className="surtitre">Ventes</p>
              <p className="chiffre mt-1 text-xl">{sales.length}</p>
            </div>
          </div>

          {business.phone ? (
            <a
              href={`tel:${business.phone.replace(/\s/g, "")}`}
              className="btn mt-4 w-full py-3"
            >
              <IconPhone className="h-4 w-4" />
              {business.phone}
            </a>
          ) : null}
        </div>
      </div>

      {business.next_action ? (
        <div className="panneau p-4">
          <p className="surtitre">Prochaine action</p>
          <p className="mt-1.5 text-sm">{business.next_action}</p>
          {business.next_action_at ? (
            <p className="mt-0.5 text-xs text-faint">
              prévue le {formatDateShort(business.next_action_at)}
            </p>
          ) : null}
        </div>
      ) : null}

      {photo ? (
        <div className="panneau overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée
              temporaire, non optimisable par next/image. */}
          <img
            src={photo}
            alt={`Devanture de ${business.name}`}
            className="max-h-80 w-full object-cover"
          />
        </div>
      ) : null}

      <Section titre="Ventes dans ce commerce">
        {sales.length === 0 ? (
          <Vide titre="Aucune vente ici pour l'instant" />
        ) : (
          <ul className="space-y-2">
            {sales.map((sale) => (
              <li key={sale.id}>
                <Link href={`/ventes/${sale.id}`} className="panneau flex items-center gap-3 p-3.5">
                  <span className="chiffre w-8 text-center text-lg">
                    {sale.quantity}
                  </span>
                  <span className="flex-1 text-xs text-faint">
                    {formatDateShort(sale.sold_at)} à {formatTime(sale.sold_at)}
                  </span>
                  <span className="chiffre text-base">
                    {formatCentsShort(sale.amount_cents)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Le formulaire d'édition n'apparaît que pour le propriétaire de la
          fiche ; l'encadrement consulte. La base applique la même règle
          (`businesses_update_own`), ceci n'est que l'écran. */}
      {proprietaire ? (
        <Section titre="Modifier la fiche">
          <div className="panneau p-5">
            <BusinessForm
              action={updateBusinessAction}
              business={business}
              userId={user.id}
              labelBouton="Enregistrer les modifications"
            />
          </div>
          <BoutonSupprimer businessId={business.id} />
        </Section>
      ) : null}
    </div>
  );
}
