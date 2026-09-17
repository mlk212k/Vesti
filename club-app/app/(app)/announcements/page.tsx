import { canManage, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
} from "./actions";

export default async function AnnouncementsPage() {
  const me = await requireUser();
  const supabase = await createClient();

  const { data: announcements = [] } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, created_at, author_id, profiles(full_name)")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Annonces</h1>
      </header>

      {canManage(me.role) && (
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Publier une annonce
          </h2>
          <form action={createAnnouncementAction} className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs text-muted">Titre</span>
              <input
                required
                name="title"
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted">Message</span>
              <textarea
                required
                name="body"
                rows={4}
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="pinned" />
              Épingler en haut
            </label>
            <button
              type="submit"
              className="rounded bg-accent px-4 py-2 font-medium text-white hover:bg-accent-strong"
            >
              Publier
            </button>
          </form>
        </section>
      )}

      <section className="space-y-3">
        {(announcements ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/50 px-4 py-6 text-center text-sm text-muted">
            Aucune annonce pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {(announcements ?? []).map((a) => {
              const author =
                (a.profiles as unknown as { full_name: string } | null)
                  ?.full_name ?? "—";
              const canDelete = canManage(me.role);
              return (
                <li
                  key={a.id}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-medium">
                      {a.pinned && "📌 "}
                      {a.title}
                    </h3>
                    <span className="text-xs text-muted">
                      {formatDate(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{a.body}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted">
                    <span>Par {author}</span>
                    {canDelete && (
                      <form action={deleteAnnouncementAction}>
                        <input
                          type="hidden"
                          name="announcement_id"
                          value={a.id}
                        />
                        <button
                          type="submit"
                          className="rounded border border-border px-2 py-1 hover:bg-surface-2"
                        >
                          Supprimer
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
