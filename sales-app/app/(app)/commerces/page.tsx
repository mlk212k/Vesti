import type { Metadata } from "next";
import Link from "next/link";
import { IconPlus, IconMap } from "@/components/icons";
import { EnTete, Vide } from "@/components/ui";
import { isStaff, requireUser } from "@/lib/auth";
import { formatDateShort } from "@/lib/format";
import { listBusinesses, listProfiles } from "@/lib/queries";
import { BUSINESS_STATUS_LABEL, type BusinessStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Commerces" };

const PASTILLE: Record<BusinessStatus, string> = {
  prospect: "pastille",
  client: "pastille pastille-succes",
  callback: "pastille pastille-alerte",
  refused: "pastille pastille-danger",
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; membre?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const staff = isStaff(user.role);

  const [businesses, profiles] = await Promise.all([
    listBusinesses({
      memberId: staff ? params.membre : user.id,
      search: params.q,
      limit: 200,
    }),
    staff ? listProfiles({ activeOnly: true }) : Promise.resolve([]),
  ]);

  const noms = new Map(profiles.map((p) => [p.id, p.full_name]));

  return (
    <div className="montee">
      <EnTete
        surtitre={staff ? "Tous les secteurs" : "Mon secteur"}
        titre="Commerces"
      >
        <Link href="/commerces/nouveau" className="btn btn-primaire">
          <IconPlus className="h-4 w-4" />
          Ajouter
        </Link>
      </EnTete>

      <form method="get" className="mb-5 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          className="champ min-w-40 flex-1"
          placeholder="Nom ou ville…"
          aria-label="Rechercher un commerce"
        />
        {staff ? (
          <select name="membre" defaultValue={params.membre ?? ""} className="champ w-auto">
            <option value="">Toute l&apos;équipe</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.full_name}
              </option>
            ))}
          </select>
        ) : null}
        <button type="submit" className="btn shrink-0">
          Chercher
        </button>
      </form>

      {businesses.length === 0 ? (
        <Vide titre="Aucun commerce">
          {params.q
            ? "Aucun résultat pour cette recherche."
            : "Chaque porte poussée mérite sa fiche : on retrouve ensuite qui a dit quoi."}
        </Vide>
      ) : (
        <ul className="space-y-2">
          {businesses.map((business) => (
            <li key={business.id}>
              <Link
                href={`/commerces/${business.id}`}
                className="panneau block p-4 transition-transform active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{business.name}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-faint">
                      <IconMap className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {[business.city, business.category]
                          .filter(Boolean)
                          .join(" · ") || "Lieu non renseigné"}
                      </span>
                    </p>
                  </div>
                  <span className={PASTILLE[business.status]}>
                    {BUSINESS_STATUS_LABEL[business.status]}
                  </span>
                </div>

                <p className="mt-2 text-[11px] text-faint">
                  {staff ? `${noms.get(business.member_id) ?? "—"} · ` : ""}
                  visité le {formatDateShort(business.visited_at)}
                  {business.next_action ? ` · à faire : ${business.next_action}` : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
