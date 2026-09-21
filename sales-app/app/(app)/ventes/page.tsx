import type { Metadata } from "next";
import Link from "next/link";
import { isStaff, requireUser } from "@/lib/auth";
import { formatDateShort, formatTime } from "@/lib/format";
import { formatCents, formatCentsShort } from "@/lib/money";
import { listProfiles, listSales } from "@/lib/queries";
import { IconChevron, IconPlus } from "@/components/icons";
import { Compteur } from "@/components/compteur";
import { EnTete, Vide } from "@/components/ui";
import { Alerte } from "@/components/alerte";

export const metadata: Metadata = { title: "Ventes" };

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ membre?: string; enregistree?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const staff = isStaff(user.role);

  // Un membre ne choisit pas : il voit les siennes. Pour l'encadrement, le
  // filtre est un confort — la RLS renverrait de toute façon ce qu'il a le
  // droit de voir, même sans filtre.
  const memberId = staff ? params.membre : user.id;

  const [sales, profiles] = await Promise.all([
    listSales({ memberId, limit: 100 }),
    staff ? listProfiles({ activeOnly: true }) : Promise.resolve([]),
  ]);

  const noms = new Map(profiles.map((p) => [p.id, p.full_name]));
  const total = sales.reduce((sum, sale) => sum + sale.amount_cents, 0);
  const cartes = sales.reduce((sum, sale) => sum + sale.quantity, 0);
  const commission = sales.reduce((sum, sale) => sum + sale.commission_cents, 0);

  return (
    <div className="space-y-8">
      <EnTete surtitre={staff ? "Toute l'équipe" : "Mes ventes"} titre="Ventes">
        {!staff ? (
          <Link href="/ventes/nouvelle" className="btn btn-primaire">
            <IconPlus className="h-4 w-4" />
            Nouvelle
          </Link>
        ) : null}
      </EnTete>

      {params.enregistree ? (
        <div>
          <Alerte ton="succes">Vente enregistrée.</Alerte>
        </div>
      ) : null}

      <section className="cascade grid grid-cols-3 gap-5">
        <div className="min-w-0">
          <p className="surtitre-serre">Chiffre d&apos;affaires</p>
          <p className="chiffre metal mt-1 text-[clamp(1.5rem,7vw,2.25rem)]">
            <Compteur valeur={total} format="montant" />
          </p>
          <p className="mt-1 text-sm text-faint">sur les ventes affichées</p>
        </div>
        <div className="min-w-0">
          <p className="surtitre-serre">Cartes</p>
          <p className="chiffre metal mt-1 text-[clamp(1.5rem,7vw,2.25rem)]">
            <Compteur valeur={cartes} />
          </p>
          <p className="mt-1 text-sm text-faint">vendues</p>
        </div>
        <div className="min-w-0">
          <p className="surtitre-serre">{staff ? "Commission" : "Mon net"}</p>
          <p className="chiffre mt-1 text-[clamp(1.5rem,7vw,2.25rem)] text-os">
            <Compteur
              valeur={staff ? commission : total - commission}
              format="montant"
            />
          </p>
          <p className="mt-1 text-sm text-faint">
            {staff ? "pour le chef" : "ce qui te revient"}
          </p>
        </div>
      </section>

      {staff ? (
        <form method="get" className="flex gap-2">
          <select name="membre" defaultValue={params.membre ?? ""} className="champ">
            <option value="">Toute l&apos;équipe</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn shrink-0">
            Filtrer
          </button>
        </form>
      ) : null}

      {sales.length === 0 ? (
        <Vide titre="Aucune vente">
          {staff
            ? "Rien n'a encore été enregistré pour cette sélection."
            : "Ta première vente s'enregistre en quelques secondes."}
        </Vide>
      ) : (
        <ul className="cascade pb-4">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Link
                href={`/ventes/${sale.id}`}
                className="group flex items-center gap-4 border-b border-trait py-4 transition-transform duration-300 active:scale-[0.985]"
              >
                <span className="chiffre w-8 shrink-0 text-xl text-craie">
                  {sale.quantity}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">
                    {sale.businesses?.name ?? "Vente directe"}
                  </p>
                  <p className="surtitre mt-0.5 truncate">
                    {staff ? `${noms.get(sale.member_id) ?? "—"} · ` : ""}
                    {formatDateShort(sale.sold_at)} à {formatTime(sale.sold_at)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="chiffre text-lg text-craie">
                    {formatCentsShort(sale.amount_cents)}
                  </p>
                  <p className="surtitre mt-0.5">
                    {formatCents(sale.unit_price_cents)} / carte
                  </p>
                </div>

                <IconChevron className="h-4 w-4 shrink-0 text-faint transition-transform duration-500 group-hover:translate-x-1" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
