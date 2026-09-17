import Link from "next/link";
import { notFound } from "next/navigation";
import { canManage, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { eventKindLabel, formatDate } from "@/lib/format";
import { deleteEventAction, setRsvpAction } from "../actions";

const rsvpLabels: Record<string, string> = {
  yes: "Présent",
  no: "Absent",
  maybe: "Peut-être",
};

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireUser();
  const supabase = await createClient();

  const { data: event, error } = await supabase
    .from("events")
    .select(
      "id, title, description, kind, location, opponent, starts_at, ends_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) notFound();

  const { data: rsvps = [] } = await supabase
    .from("event_rsvps")
    .select("user_id, status, updated_at, profiles(full_name)")
    .eq("event_id", id);

  const myRsvp = (rsvps ?? []).find((r) => r.user_id === me.id)?.status ?? null;
  const counts = { yes: 0, no: 0, maybe: 0 } as Record<string, number>;
  for (const r of rsvps ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;

  return (
    <div className="space-y-8">
      <div className="text-sm">
        <Link href="/events" className="text-muted hover:text-foreground">
          ← Calendrier
        </Link>
      </div>

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted">
          <span>{eventKindLabel(event.kind)}</span>
          <span>·</span>
          <span>{formatDate(event.starts_at)}</span>
        </div>
        <h1 className="text-2xl font-semibold">
          {event.title}
          {event.opponent ? (
            <span className="text-muted"> vs {event.opponent}</span>
          ) : null}
        </h1>
        {event.location && (
          <div className="text-muted">📍 {event.location}</div>
        )}
        {event.description && (
          <p className="whitespace-pre-wrap pt-2 text-sm">
            {event.description}
          </p>
        )}
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ta réponse</h2>
        <div className="flex flex-wrap gap-2">
          {(["yes", "maybe", "no"] as const).map((status) => (
            <form key={status} action={setRsvpAction}>
              <input type="hidden" name="event_id" value={event.id} />
              <input type="hidden" name="status" value={status} />
              <button
                type="submit"
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  myRsvp === status
                    ? "bg-accent text-black"
                    : "border border-border bg-surface hover:bg-surface-2"
                }`}
              >
                {rsvpLabels[status]}
              </button>
            </form>
          ))}
        </div>
        <p className="text-xs text-muted">
          {counts.yes} présent{counts.yes > 1 ? "s" : ""} · {counts.maybe}{" "}
          peut-être · {counts.no} absent{counts.no > 1 ? "s" : ""}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Réponses de l&apos;équipe</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {(["yes", "maybe", "no"] as const).map((status) => (
            <div
              key={status}
              className="rounded-lg border border-border bg-surface p-3"
            >
              <div className="mb-2 text-xs uppercase tracking-wide text-muted">
                {rsvpLabels[status]} ({counts[status]})
              </div>
              <ul className="space-y-1 text-sm">
                {(rsvps ?? [])
                  .filter((r) => r.status === status)
                  .map((r) => (
                    <li key={r.user_id} className="text-foreground">
                      {/* profiles is a nested to-one from the join */}
                      {(r.profiles as unknown as { full_name: string } | null)
                        ?.full_name ?? "Membre inconnu"}
                    </li>
                  ))}
                {(rsvps ?? []).filter((r) => r.status === status).length ===
                  0 && (
                  <li className="text-muted">—</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {canManage(me.role) && (
        <section>
          <form action={deleteEventAction}>
            <input type="hidden" name="event_id" value={event.id} />
            <button
              type="submit"
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              Supprimer cet événement
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
