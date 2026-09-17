import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/format";
import { removeMemberAction, setMemberRoleAction } from "./actions";

export default async function MembersPage() {
  const me = await requireUser();
  const supabase = await createClient();

  const { data: members = [] } = await supabase
    .from("profiles")
    .select("id, full_name, role, jersey_number, position, phone, created_at")
    .order("role", { ascending: true })
    .order("full_name", { ascending: true });

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Membres</h1>
          <p className="text-sm text-muted">
            {(members ?? []).length} membre{(members ?? []).length > 1 ? "s" : ""} au club.
          </p>
        </div>
      </header>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Poste</th>
              <th className="px-4 py-3">Contact</th>
              {me.role === "admin" && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{m.full_name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted">
                    {roleLabel(m.role)}
                  </span>
                </td>
                <td className="px-4 py-3">{m.jersey_number ?? "—"}</td>
                <td className="px-4 py-3">{m.position ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{m.phone ?? "—"}</td>
                {me.role === "admin" && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <form action={setMemberRoleAction} className="flex gap-1">
                        <input type="hidden" name="member_id" value={m.id} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          className="rounded border border-border bg-surface-2 px-2 py-1 text-xs"
                        >
                          <option value="member">Membre</option>
                          <option value="coach">Coach</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded border border-border px-2 py-1 text-xs hover:bg-surface-2"
                        >
                          OK
                        </button>
                      </form>
                      {m.id !== me.id && (
                        <form action={removeMemberAction}>
                          <input
                            type="hidden"
                            name="member_id"
                            value={m.id}
                          />
                          <button
                            type="submit"
                            className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/10"
                          >
                            Retirer
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
