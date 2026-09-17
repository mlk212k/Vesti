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
      <header>
        <h1 className="text-2xl font-semibold">Membres</h1>
        <p className="text-sm text-muted">
          {(members ?? []).length} membre
          {(members ?? []).length > 1 ? "s" : ""} au club.
        </p>
      </header>

      <ul className="space-y-2">
        {(members ?? []).map((m) => {
          const initial = m.full_name.trim().charAt(0).toUpperCase() || "?";
          const details = [
            m.jersey_number != null ? `N°${m.jersey_number}` : null,
            m.position,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li
              key={m.id}
              className="rounded-xl border border-border bg-surface p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent-strong">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {m.full_name}
                    </span>
                    <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                      {roleLabel(m.role)}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted">
                    {details || m.phone || "—"}
                  </div>
                </div>
              </div>

              {me.role === "admin" && (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <form
                    action={setMemberRoleAction}
                    className="flex flex-1 gap-1.5"
                  >
                    <input type="hidden" name="member_id" value={m.id} />
                    <select
                      name="role"
                      defaultValue={m.role}
                      className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs"
                    >
                      <option value="member">Membre</option>
                      <option value="coach">Coach</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded border border-border px-2.5 py-1.5 text-xs hover:bg-surface-2"
                    >
                      OK
                    </button>
                  </form>
                  {m.id !== me.id && (
                    <form action={removeMemberAction}>
                      <input type="hidden" name="member_id" value={m.id} />
                      <button
                        type="submit"
                        className="rounded border border-accent/30 px-2.5 py-1.5 text-xs text-accent-strong hover:bg-accent/5"
                      >
                        Retirer
                      </button>
                    </form>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
