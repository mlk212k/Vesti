import type { Metadata } from "next";
import { EnTete, Vide } from "@/components/ui";
import { requireRole } from "@/lib/auth";
import { auditLabel, AUDIT_FAMILLES } from "@/lib/audit";
import { formatDateTime } from "@/lib/format";
import { listProfiles } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { AuditLog } from "@/lib/types";

export const metadata: Metadata = { title: "Audit" };

// Journal d'audit, admin uniquement (policy `audit_select_admin`).
//
// Les lignes ne sont écrites que par les fonctions SQL et `log_audit` : ni
// l'app ni un client ne peut en insérer, en modifier ou en supprimer une.
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ famille?: string; acteur?: string }>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const actions = params.famille ? AUDIT_FAMILLES[params.famille] : undefined;
  if (actions) query = query.in("action", actions);
  if (params.acteur) query = query.eq("actor_id", params.acteur);

  const [logsRes, profiles] = await Promise.all([
    query.returns<AuditLog[]>(),
    listProfiles(),
  ]);

  const logs = logsRes.data ?? [];
  const noms = new Map(profiles.map((p) => [p.id, p.full_name]));

  return (
    <div className="space-y-6">
      <EnTete surtitre="Tout ce qui s'est passé" titre="Audit" />

      <form method="get" className="flex flex-wrap gap-2">
        <select name="famille" defaultValue={params.famille ?? ""} className="champ w-auto">
          <option value="">Toutes les actions</option>
          {Object.keys(AUDIT_FAMILLES).map((famille) => (
            <option key={famille} value={famille}>
              {famille}
            </option>
          ))}
        </select>
        <select name="acteur" defaultValue={params.acteur ?? ""} className="champ w-auto">
          <option value="">Tout le monde</option>
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

      {logs.length === 0 ? (
        <Vide titre="Aucune entrée" />
      ) : (
        <ul className="space-y-1.5">
          {logs.map((log) => (
            <li key={log.id} className="panneau-plat px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium">{auditLabel(log.action)}</p>
                <span className="shrink-0 text-sm text-faint">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-faint">
                {log.actor_id ? (noms.get(log.actor_id) ?? "Compte supprimé") : "Système"}
                {log.entity_type ? ` · ${log.entity_type}` : ""}
              </p>
              {Object.keys(log.metadata ?? {}).length > 0 ? (
                <pre className="mt-2 overflow-x-auto rounded-lg bg-black/40 p-2.5 text-sm leading-relaxed text-dim">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
