import Image from "next/image";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/format";
import { removeMemberAction, setMemberRoleAction } from "./actions";

export default async function MembersPage() {
  const me = await requireUser();
  const supabase = await createClient();

  const { data: members = [] } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, category, jersey_number, position, phone, avatar_url, created_at",
    )
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
            m.category ? categoryLabel(m.category) : null,
            m.jersey_number != null ? `N°${m.jersey_number}` : null,
            m.position,
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li key={m.id} className="clay p-3">
              <div className="flex items-center gap-3">
                <div className="clay-galet flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden text-sm font-semibold text-accent-strong">
                  {m.avatar_url ? (
                    <Image
                      src={m.avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 object-cover"
                      unoptimized
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {m.full_name}
                    </span>
                    <span className="clay-galet shrink-0 px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                      {roleLabel(m.role)}
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted">
                    {details || m.phone || "—"}
                  </div>
                </div>
              </div>

              {(() => {
                const canChangeRole = me.role === "admin" && m.id !== me.id;
                const canRemove =
                  m.id !== me.id &&
                  (me.role === "admin" ||
                    (me.role === "coach" && m.role !== "admin"));

                if (!canChangeRole && !canRemove) return null;

                return (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {canChangeRole && (
                      <form
                        action={setMemberRoleAction}
                        className="flex flex-1 gap-1.5"
                      >
                        <input type="hidden" name="member_id" value={m.id} />
                        <select
                          name="role"
                          defaultValue={m.role}
                          className="clay-creux flex-1 px-2 py-1.5 text-xs"
                        >
                          <option value="member">Membre</option>
                          <option value="coach">Coach</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          type="submit"
                          className="clay-galet clay-presse px-3 py-1.5 text-xs"
                        >
                          OK
                        </button>
                      </form>
                    )}
                    {canRemove && (
                      <form action={removeMemberAction}>
                        <input type="hidden" name="member_id" value={m.id} />
                        <button
                          type="submit"
                          className="clay-creux clay-presse px-3 py-1.5 text-xs text-accent-strong"
                        >
                          Retirer
                        </button>
                      </form>
                    )}
                  </div>
                );
              })()}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
