"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const kindSchema = z.enum(["match", "training", "meeting", "other"]);

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  kind: kindSchema,
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
