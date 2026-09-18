import Link from "next/link";
import { requireUser, canManage } from "@/lib/auth";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { eventKindLabel, formatDate } from "@/lib/format";
import { createEventAction } from "./actions";

export default async function EventsPage() {
  const me = await requireUser();
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const [{ data: upcoming = [] }, { data: past = [] }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, kind, category, starts_at, location, opponent, score_home, score_away")
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true }),
    supabase
      .from("events")
      .select("id, title, kind, category, starts_at, location, opponent, score_home, score_away")
      .lt("starts_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Calendrier</h1>
      </header>

      {canManage(me.role) && (
        <section className="rounded-lg border border-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Créer un événement
          </h2>
          <form action={createEventAction} className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted">Titre</span>
              <input
                required
                name="title"
                placeholder="Match vs FC Voisin"
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Type</span>
              <select
                name="kind"
                defaultValue="training"
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              >
                <option value="match">Match</option>
                <option value="training">Entraînement</option>
                <option value="meeting">Réunion</option>
                <option value="other">Autre</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Catégorie (optionnel)</span>
              <select
                name="category"
                defaultValue=""
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              >
                <option value="">Toutes / non précisé</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Adversaire (optionnel)</span>
              <input
                name="opponent"
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Début</span>
              <input
                required
                type="datetime-local"
                name="starts_at"
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Fin (optionnel)</span>
              <input
                type="datetime-local"
                name="ends_at"
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted">Lieu</span>
              <input
                name="location"
                placeholder="Stade municipal"
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs text-muted">Description</span>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded border border-border bg-surface-2 px-3 py-2"
              />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="rounded bg-accent px-4 py-2 font-medium text-white hover:bg-accent-strong"
              >
                Créer
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">À venir</h2>
        {(upcoming ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-surface/50 px-4 py-6 text-center text-sm text-muted">
            Rien de prévu pour le moment.
          </p>
        ) : (
          <EventList events={upcoming ?? []} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Passés</h2>
        {(past ?? []).length === 0 ? (
          <p className="text-sm text-muted">Aucun événement passé.</p>
        ) : (
          <EventList events={past ?? []} />
        )}
      </section>
    </div>
  );
}

function EventList({
  events,
}: {
  events: Array<{
    id: string;
    title: string;
    kind: string;
    category: string | null;
    starts_at: string;
    location: string | null;
    opponent: string | null;
    score_home: number | null;
    score_away: number | null;
  }>;
}) {
  return (
    <ul className="space-y-2">
      {events.map((ev) => (
        <li key={ev.id}>
          <Link
            href={`/events/${ev.id}`}
            className="block rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-2 transition"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wide text-muted">
                {eventKindLabel(ev.kind)}
                {ev.category ? ` · ${categoryLabel(ev.category)}` : ""}
              </span>
              <span className="text-xs text-muted">
                {formatDate(ev.starts_at)}
              </span>
            </div>
            <div className="mt-1 font-medium">
              {ev.title}
              {ev.opponent ? (
                <span className="text-muted"> vs {ev.opponent}</span>
              ) : null}
              {ev.score_home != null && ev.score_away != null && (
                <span className="ml-2 text-accent-strong">
                  {ev.score_home} – {ev.score_away}
                </span>
              )}
            </div>
            {ev.location && (
              <div className="text-sm text-muted">📍 {ev.location}</div>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
