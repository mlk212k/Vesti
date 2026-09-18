import Link from "next/link";
import { notFound } from "next/navigation";
import { canManage, isCoach, requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { eventKindLabel, formatDate } from "@/lib/format";
import {
  deleteEventAction,
  setRsvpAction,
  setScoreAction,
  toggleCallupAction,
} from "../actions";

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
      "id, title, description, kind, category, location, opponent, starts_at, ends_at, score_home, score_away, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!event) notFound();

  const [{ data: rsvps = [] }, { data: callups = [] }, categoryMembers] =
    await Promise.all([
      supabase
        .from("event_rsvps")
        .select("user_id, status, updated_at, profiles(full_name)")
        .eq("event_id", id),
      supabase.from("event_callups").select("user_id").eq("event_id", id),
      event.category
        ? supabase
            .from("profiles")
            .select("id, full_name")
            .eq("category", event.category)
            .order("full_name", { ascending: true })
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ]);

  const myRsvp = (rsvps ?? []).find((r) => r.user_id === me.id)?.status ?? null;
  const counts = { yes: 0, no: 0, maybe: 0 } as Record<string, number>;
  for (const r of rsvps ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;
  const calledUpIds = new Set((callups ?? []).map((c) => c.user_id));
  const hasScore = event.score_home != null && event.score_away != null;

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
          {event.category && (
            <>
              <span>·</span>
              <span>{categoryLabel(event.category)}</span>
            </>
          )}
          <span>·</span>
          <span>{formatDate(event.starts_at)}</span>
        </div>
        <h1 className="text-2xl font-semibold">
          {event.title}
          {event.opponent ? (
            <span className="text-muted"> vs {event.opponent}</span>
          ) : null}
        </h1>
        {hasScore && (
          <div className="text-3xl font-bold text-accent-strong">
            {event.score_home} – {event.score_away}
          </div>
        )}
        {event.location && (
          <div className="text-muted">📍 {event.location}</div>
        )}
        {event.description && (
          <p className="whitespace-pre-wrap pt-2 text-sm">
            {event.description}
          </p>
        )}
      </header>

      {event.kind === "match" && canManage(me.role) && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Score</h2>
          <form
            action={setScoreAction}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="event_id" value={event.id} />
            <input
              type="number"
              name="score_home"
              min={0}
              max={99}
              defaultValue={event.score_home ?? ""}
              placeholder="Nous"
              className="w-16 rounded border border-border bg-surface px-2 py-1.5 text-center"
            />
            <span className="text-muted">–</span>
            <input
              type="number"
              name="score_away"
              min={0}
              max={99}
              defaultValue={event.score_away ?? ""}
              placeholder="Eux"
              className="w-16 rounded border border-border bg-surface px-2 py-1.5 text-center"
            />
            <button
              type="submit"
              className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-2"
            >
              Enregistrer
            </button>
          </form>
        </section>
      )}

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
                    ? "bg-accent text-white"
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
        <div className="grid grid-cols-3 gap-2">
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

      {event.category && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Convocation · {categoryLabel(event.category)}
          </h2>
          {(categoryMembers.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">
              Aucun membre dans cette catégorie pour l&apos;instant.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {(categoryMembers.data ?? []).map((member) => {
                const called = calledUpIds.has(member.id);
                return (
                  <li
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2"
                  >
                    <span className="text-sm">{member.full_name}</span>
                    {isCoach(me.role) ? (
                      <form action={toggleCallupAction}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <input
                          type="hidden"
                          name="member_id"
                          value={member.id}
                        />
                        <input
                          type="hidden"
                          name="called"
                          value={called ? "true" : "false"}
                        />
                        <button
                          type="submit"
                          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            called
                              ? "bg-accent text-white"
                              : "border border-border text-muted hover:bg-surface-2"
                          }`}
                        >
                          {called ? "Convoqué ✓" : "Convoquer"}
                        </button>
                      </form>
                    ) : (
                      <span
                        className={`text-xs ${called ? "text-accent-strong" : "text-muted"}`}
                      >
                        {called ? "Convoqué" : "—"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {canManage(me.role) && (
        <section>
          <form action={deleteEventAction}>
            <input type="hidden" name="event_id" value={event.id} />
            <button
              type="submit"
              className="rounded-lg border border-accent/30 px-4 py-2 text-sm text-accent-strong hover:bg-accent/5"
            >
              Supprimer cet événement
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
