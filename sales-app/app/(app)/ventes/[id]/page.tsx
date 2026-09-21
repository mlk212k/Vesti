import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBack } from "@/components/icons";
import { isAdmin, requireUser } from "@/lib/auth";
import { formatDateLong, formatTime } from "@/lib/format";
import { formatCents, formatRate } from "@/lib/money";
import { listBusinesses } from "@/lib/queries";
import { signedProofUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { Business, Sale } from "@/lib/types";
import { EditSale } from "./edit-sale";

export const metadata: Metadata = { title: "Vente" };

export default async function SalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  // Pas de vérification de propriétaire écrite ici : la RLS ne renvoie la
  // ligne que si la personne a le droit de la voir. Un membre qui remplace
  // l'id dans l'URL par celui d'un collègue obtient `null`, donc un 404.
  const { data: sale } = await supabase
    .from("sales")
    .select("*")
    .eq("id", id)
    .maybeSingle<Sale>();

  if (!sale) notFound();

  const [businesses, photo, auteur] = await Promise.all([
    listBusinesses({ memberId: sale.member_id, limit: 200 }),
    signedProofUrl(sale.photo_url),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", sale.member_id)
      .maybeSingle<{ full_name: string }>(),
  ]);

  const commerce: Business | undefined = businesses.find(
    (b) => b.id === sale.business_id,
  );

  return (
    <div>
      <Link
        href="/ventes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-faint hover:text-dim"
      >
        <IconBack className="h-4 w-4" />
        Ventes
      </Link>

      <div className="panneau mb-5 p-5">
        <p className="surtitre">
          {formatDateLong(sale.sold_at)} · {formatTime(sale.sold_at)}
        </p>
        <p className="chiffre metal mt-2 text-5xl">{formatCents(sale.amount_cents)}</p>
        <p className="mt-2 text-sm text-dim">
          {sale.quantity} carte{sale.quantity > 1 ? "s" : ""} ×{" "}
          {formatCents(sale.unit_price_cents)}
          {auteur.data ? ` · ${auteur.data.full_name}` : ""}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="panneau-creux p-3">
            <p className="surtitre">
              Commission ({formatRate(sale.commission_rate_bp)})
            </p>
            <p className="chiffre mt-1 text-xl">
              {formatCents(sale.commission_cents)}
            </p>
          </div>
          <div className="panneau-creux p-3">
            <p className="surtitre">Net commercial</p>
            <p className="chiffre mt-1 text-xl">{formatCents(sale.net_cents)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {commerce ? (
          <Link href={`/commerces/${commerce.id}`} className="panneau block p-4">
            <p className="surtitre">Commerce</p>
            <p className="mt-1 font-medium">{commerce.name}</p>
            <p className="text-sm text-faint">
              {[commerce.address, commerce.city].filter(Boolean).join(" · ") ||
                "Adresse non renseignée"}
            </p>
          </Link>
        ) : (
          <div className="panneau p-4">
            <p className="surtitre">Commerce</p>
            <p className="mt-1 text-sm text-faint">Vente directe, sans fiche.</p>
          </div>
        )}

        {sale.notes ? (
          <div className="panneau p-4">
            <p className="surtitre">Notes</p>
            <p className="texte-libre mt-1.5 text-sm whitespace-pre-wrap text-dim">
              {sale.notes}
            </p>
          </div>
        ) : null}

        {photo ? (
          <div className="panneau overflow-hidden">
            <p className="surtitre px-4 pt-4">Preuve</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- URL signée
                temporaire : l'optimiseur d'images ne peut pas la mettre en
                cache, et elle expire dans l'heure. */}
            <img
              src={photo}
              alt="Preuve de la vente"
              className="mt-3 max-h-96 w-full object-contain"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-5">
        <EditSale
          sale={sale}
          businesses={businesses}
          peutSupprimer={isAdmin(user.role)}
        />
      </div>
    </div>
  );
}
