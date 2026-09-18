"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { formatDate } from "@/lib/format";
import { sendPushToUser } from "@/lib/push/send";
import { createClient } from "@/lib/supabase/server";

const kindSchema = z.enum(["match", "training", "meeting", "other"]);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  kind: kindSchema,
  category: z.enum(CATEGORIES).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  opponent: z.string().max(200).optional().nullable(),
  starts_at: z.string().min(1),
  ends_at: z.string().optional().nullable(),
});

function nullableString(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function toIso(local: string): string {
  // <input type="datetime-local"> gives us naive ISO like "2026-10-01T18:30".
  // Assume the user's local zone.
  const d = new Date(local);
  return d.toISOString();
}

export async function createEventAction(formData: FormData) {
  const user = await requireRole("admin", "coach");

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    description: nullableString(formData.get("description")),
    kind: formData.get("kind"),
    category: formData.get("category") || null,
    location: nullableString(formData.get("location")),
    opponent: nullableString(formData.get("opponent")),
    starts_at: formData.get("starts_at"),
    ends_at: nullableString(formData.get("ends_at")),
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
      kind: parsed.data.kind,
      category: parsed.data.category,
      location: parsed.data.location,
      opponent: parsed.data.opponent,
      starts_at: toIso(parsed.data.starts_at),
      ends_at: parsed.data.ends_at ? toIso(parsed.data.ends_at) : null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/events");
  revalidatePath("/dashboard");
  redirect(`/events/${data.id}`);
}

export async function deleteEventAction(formData: FormData) {
  await requireRole("admin", "coach");
  const id = z.string().uuid().parse(formData.get("event_id"));

  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/events");
  revalidatePath("/dashboard");
  redirect("/events");
}

export async function setRsvpAction(formData: FormData) {
  const user = await requireUser();
  const eventId = z.string().uuid().parse(formData.get("event_id"));
  const status = z.enum(["yes", "no", "maybe"]).parse(formData.get("status"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("event_rsvps")
    .upsert(
      {
        event_id: eventId,
        user_id: user.id,
        status,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id,user_id" },
    );
  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}

export async function setScoreAction(formData: FormData) {
  await requireRole("admin", "coach");
  const eventId = z.string().uuid().parse(formData.get("event_id"));
  const scoreHome = z.coerce.number().int().min(0).max(99).parse(formData.get("score_home"));
  const scoreAway = z.coerce.number().int().min(0).max(99).parse(formData.get("score_away"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ score_home: scoreHome, score_away: scoreAway })
    .eq("id", eventId);
  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
}

export async function toggleCallupAction(formData: FormData) {
  // Team selection is a coaching call, not an admin/officer one — even an
  // admin doesn't get this button (see the read-only fallback in the UI).
  const coach = await requireRole("coach");
  const eventId = z.string().uuid().parse(formData.get("event_id"));
  const memberId = z.string().uuid().parse(formData.get("member_id"));
  const called = formData.get("called") === "true";

  const supabase = await createClient();
  if (called) {
    const { error } = await supabase
      .from("event_callups")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", memberId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("event_callups")
      .insert({ event_id: eventId, user_id: memberId, called_by: coach.id });
    if (error) throw new Error(error.message);

    const { data: event } = await supabase
      .from("events")
      .select("title, category, starts_at, location, opponent")
      .eq("id", eventId)
      .single();
    if (event) {
      const parts = [formatDate(event.starts_at)];
      if (event.location) parts.push(event.location);
      await sendPushToUser(memberId, {
        title: `Convocation${event.category ? ` · ${categoryLabel(event.category)}` : ""}`,
        body: `${event.title}${event.opponent ? ` vs ${event.opponent}` : ""} — ${parts.join(" · ")}`,
        url: `/events/${eventId}`,
      });
    }
  }

  revalidatePath(`/events/${eventId}`);
}
