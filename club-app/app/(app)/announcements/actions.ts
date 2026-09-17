"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  pinned: z.boolean().optional().default(false),
});

export async function createAnnouncementAction(formData: FormData) {
  const user = await requireRole("admin", "coach");

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    pinned: formData.get("pinned") === "on",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title: parsed.data.title,
    body: parsed.data.body,
    pinned: parsed.data.pinned,
    author_id: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}

export async function deleteAnnouncementAction(formData: FormData) {
  await requireRole("admin", "coach");
  const id = z.string().uuid().parse(formData.get("announcement_id"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/announcements");
  revalidatePath("/dashboard");
}
