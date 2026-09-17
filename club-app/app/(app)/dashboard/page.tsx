import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { canManage, requireUser } from "@/lib/auth";
import { eventKindLabel, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const nowIso = new Date().toISOString();
  const [{ data: upcoming = [] }, { data: announcements = [] }, { count: memberCount }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, title, kind, starts_at, location, opponent")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(5),
      supabase
        .from("announcements")
        .select("id, title, body, pinned, created_at")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">
          Salut {user.full_name.split(" ")[0]} 👋
        </h1>
        <p className="text-muted">
          Voici ce qui se passe au club en ce moment.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Prochains évts." value={(upcoming ?? []).length} />
        <StatCard label="Annonces" value={(announcements ?? []).length} />
        <StatCard label="Membres" value={memberCount ?? 0} />
      </section>

      {canManage(user.role) && (
        <Link
          href="/training"
          className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 transition hover:bg-accent/10"
        >
          <div>
            <div className="font-medium text-accent-strong">
              Préparer un entraînement (IA)
            </div>
            <div className="text-sm text-muted">
              Génère une séance détaillée selon la spécificité et le thème.
            </div>
          </div>
          <span className="text-accent-strong">→</span>
        </Link>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <SectionHeader
            title="Prochains événements"
            href="/events"
            hrefLabel="Voir tout"
          />
          {(upcoming ?? []).length === 0 ? (
            <EmptyCard>Aucun événement à venir.</EmptyCard>
          ) : (
            <ul className="space-y-2">
              {(upcoming ?? []).map((ev) => (
                <li key={ev.id}>
                  <Link
                    href={`/events/${ev.id}`}
                    className="block rounded-lg border border-border bg-surface px-4 py-3 hover:bg-surface-2 transition"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs uppercase tracking-wide text-muted">
                        {eventKindLabel(ev.kind)}
                      </span>
                      <span className="text-xs text-muted">
                        {formatDate(ev.starts_at)}
                      </span>
                    </div>
                    <div className="font-medium mt-1">
                      {ev.title}
                      {ev.opponent ? (
                        <span className="text-muted"> vs {ev.opponent}</span>
                      ) : null}
                    </div>
                    {ev.location && (
                      <div className="text-sm text-muted">📍 {ev.location}</div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <SectionHeader
            title="Annonces récentes"
            href="/announcements"
            hrefLabel="Voir tout"
          />
          {(announcements ?? []).length === 0 ? (
            <EmptyCard>Pas encore d&apos;annonce.</EmptyCard>
          ) : (
            <ul className="space-y-2">
              {(announcements ?? []).map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-border bg-surface px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {a.pinned && "📌 "}
                      {a.title}
                    </span>
                    <span className="text-xs text-muted">
                      {formatDate(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted line-clamp-3 whitespace-pre-wrap">
                    {a.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function SectionHeader({
  title,
  href,
  hrefLabel,
}: {
  title: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link href={href} className="text-sm text-accent hover:underline">
        {hrefLabel} →
      </Link>
    </div>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface/50 px-4 py-6 text-center text-sm text-muted">
      {children}
    </div>
  );
}
