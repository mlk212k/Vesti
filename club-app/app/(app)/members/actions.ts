"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const roleSchema = z.enum(["admin", "coach", "member"]);

export async function setMemberRoleAction(formData: FormData) {
  await requireRole("admin");

  const memberId = z.string().uuid().parse(formData.get("member_id"));
  const role = roleSchema.parse(formData.get("role"));

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", memberId);
  if (error) throw new Error(error.message);

  revalidatePath("/members");
}

export async function removeMemberAction(formData: FormData) {
  const me = await requireRole("admin", "coach");

  const memberId = z.string().uuid().parse(formData.get("member_id"));
  if (memberId === me.id) throw new Error("Tu ne peux pas te retirer toi-même");

  const supabase = await createClient();

  // A coach can expel members and other coaches, but never an admin — only
  // an admin can remove another admin. Check the target's current role
  // before deleting; RLS enforces the same boundary server-side either way.
  if (me.role === "coach") {
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", memberId)
      .single();
    if (target?.role === "admin") {
      throw new Error("Seul un admin peut retirer un autre admin");
    }
  }

  // Delete the profile row — the auth.users row stays; deleting an auth user
  // from a Server Action needs the service_role key, which we don't ship
  // client-safe. Removing the profile is enough to lock them out of the app.
  const { error } = await supabase.from("profiles").delete().eq("id", memberId);
  if (error) throw new Error(error.message);

  revalidatePath("/members");
}
