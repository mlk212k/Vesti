import { NextRequest, NextResponse } from "next/server";
import { categoryLabel } from "@/lib/categories";
import { formatShort } from "@/lib/format";
import { sendPushToUser } from "@/lib/push/send";
import { createAdminClient } from "@/lib/supabase/admin";

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

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  const { start, end } = getParisDayBoundsUtc(new Date());

  const { data: trainings, error } = await supabase
    .from("events")
    .select("id, title, category, starts_at, location")
    .eq("kind", "training")
    .is("reminder_sent_at", null)
    .gte("starts_at", start.toISOString())
    .lt("starts_at", end.toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let notified = 0;
  for (const training of trainings ?? []) {
    let membersQuery = supabase.from("profiles").select("id");
    if (training.category) {
      membersQuery = membersQuery.eq("category", training.category);
    }
    const { data: members } = await membersQuery;

    await Promise.all(
      (members ?? []).map((member: { id: string }) =>
        sendPushToUser(supabase, member.id, {
          title: `Entraînement aujourd'hui${training.category ? ` · ${categoryLabel(training.category)}` : ""}`,
          body: `${training.title} — ${formatShort(training.starts_at)}${training.location ? ` · ${training.location}` : ""}`,
          url: `/events/${training.id}`,
        }),
      ),
    );
    notified += members?.length ?? 0;

    await supabase
      .from("events")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", training.id);
  }

  return NextResponse.json({
    ok: true,
    trainings: trainings?.length ?? 0,
    notified,
  });
}
