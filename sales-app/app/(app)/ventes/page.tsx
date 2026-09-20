import type { Metadata } from "next";
import Link from "next/link";
import { isStaff, requireUser } from "@/lib/auth";
import { formatDateShort, formatTime } from "@/lib/format";
import { formatCents, formatCentsShort } from "@/lib/money";
import { listProfiles, listSales } from "@/lib/queries";
import { IconPlus } from "@/components/icons";
import { EnTete, Stat, Vide } from "@/components/ui";
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
    <div className="montee">
      <EnTete surtitre={staff ? "Toute l'équipe" : "Mes ventes"} titre="Ventes">
        {!staff ? (
          <Link href="/ventes/nouvelle" className="btn btn-primaire">
            <IconPlus className="h-4 w-4" />
            Nouvelle
          </Link>
        ) : null}
      </EnTete>

      {params.enregistree ? (
        <div className="mb-4">
          <Alerte ton="succes">Vente enregistrée.</Alerte>
        </div>
      ) : null}

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="CA affiché" valeur={formatCentsShort(total)} accent />
        <Stat label="Cartes" valeur={cartes} />
        <Stat
          label={staff ? "Commission" : "Mon net"}
          valeur={formatCentsShort(staff ? commission : total - commission)}
        />
      </div>

      {staff ? (
        <form method="get" className="mb-5 flex gap-2">
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
        <ul className="space-y-2">
          {sales.map((sale) => (
            <li key={sale.id}>
              <Link
                href={`/ventes/${sale.id}`}
                className="panneau flex items-center gap-3 p-4 transition-transform active:scale-[0.99]"
              >
                <span className="chiffre w-10 shrink-0 text-center text-xl">
                  {sale.quantity}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {sale.businesses?.name ?? "Vente directe"}
                  </p>
                  <p className="text-sm text-faint">
                    {staff ? `${noms.get(sale.member_id) ?? "—"} · ` : ""}
                    {formatDateShort(sale.sold_at)} à {formatTime(sale.sold_at)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="chiffre text-base">
                    {formatCentsShort(sale.amount_cents)}
                  </p>
                  <p className="text-sm text-faint">
                    {formatCents(sale.unit_price_cents)} / carte
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
