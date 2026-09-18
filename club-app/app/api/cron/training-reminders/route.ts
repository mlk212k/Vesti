import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { categoryLabel } from "@/lib/categories";
import { formatShort } from "@/lib/format";
import { configureWebPush, sendPushPayload } from "@/lib/push/send";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

// Every event.starts_at is a UTC instant; "today" for reminder purposes
// means the club's own calendar day (Europe/Paris), not the UTC one —
// reconstructing Paris's current wall-clock reading gives the live
// UTC offset for this instant, DST included, with no date library.
function getParisDayBoundsUtc(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  const parisAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = parisAsUtc - now.getTime();
  const parisMidnightAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"));
  const start = new Date(parisMidnightAsUtc - offsetMs);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

type DueReminderRow = {
  training_id: string;
  title: string;
  category: string | null;
  starts_at: string;
  location: string | null;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function GET(request: NextRequest) {
  // Vercel sends this same value as the cron's own Authorization header;
  // it's then forwarded as p_secret below, so one secret gates both the
  // route and the Supabase RPCs behind it — no service_role key needed,
  // just the already-public anon key.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET missing" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!configureWebPush()) {
    return NextResponse.json({ ok: true, skipped: "VAPID_PRIVATE_KEY missing" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { start, end } = getParisDayBoundsUtc(new Date());

  const { data: rows, error } = await supabase.rpc("cron_due_training_reminders", {
    p_secret: cronSecret,
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const trainingIds = new Set<string>();
  let notified = 0;

  await Promise.all(
    ((rows ?? []) as DueReminderRow[]).map(async (row) => {
      trainingIds.add(row.training_id);
      const parts = [formatShort(row.starts_at)];
      if (row.location) parts.push(row.location);

      const { ok, dead } = await sendPushPayload(row, {
        title: `Entraînement aujourd'hui${row.category ? ` · ${categoryLabel(row.category)}` : ""}`,
        body: `${row.title} — ${parts.join(" · ")}`,
        url: `/events/${row.training_id}`,
      });
      if (ok) notified++;
      if (dead) {
        await supabase.rpc("cron_delete_push_subscription", {
          p_secret: cronSecret,
          p_endpoint: row.endpoint,
        });
      }
    }),
  );

  if (trainingIds.size > 0) {
    await supabase.rpc("cron_mark_reminders_sent", {
      p_secret: cronSecret,
      p_training_ids: Array.from(trainingIds),
    });
  }

  return NextResponse.json({
    ok: true,
    trainings: trainingIds.size,
    notified,
  });
}
