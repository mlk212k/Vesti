"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Gestion des comptes. Réservée à l'admin.
//
// La création d'un compte est la seule opération qui exige la clé
// service_role : l'API d'auth ne permet pas de créer quelqu'un d'autre avec
// une clé publique. Le rôle est écrit APRÈS la création, par une requête
// séparée — le trigger `handle_new_user` fait naître tout le monde `member`,
// justement pour que personne ne puisse se déclarer admin à l'inscription.

const createSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Email invalide")),
  password: z.string().min(8, "8 caractères minimum"),
  full_name: z.string().trim().min(1, "Nom requis").max(120),
  role: z.enum(["admin", "manager", "member"]),
  phone: z.string().trim().max(40).optional(),
  daily_goal_override: z.coerce.number().int().min(1).max(1000).optional(),
});

export async function createMemberAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const rawGoal = String(formData.get("daily_goal_override") ?? "").trim();
    const parsed = createSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
      full_name: formData.get("full_name"),
      role: formData.get("role") ?? "member",
      phone: formData.get("phone") || undefined,
      daily_goal_override: rawGoal || undefined,
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      // Comptes créés par le chef : pas d'email de confirmation à cliquer,
      // le commercial se connecte tout de suite avec ce qu'on lui a donné.
      email_confirm: true,
      user_metadata: { full_name: parsed.data.full_name },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return { ok: false, error: "Un compte existe déjà avec cet email." };
      }
      throw error;
    }

    const userId = data.user?.id;
    if (!userId) return { ok: false, error: "Création impossible." };

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        role: parsed.data.role,
        phone: parsed.data.phone ?? null,
        daily_goal_override: parsed.data.daily_goal_override ?? null,
      })
      .eq("id", userId);
    if (profileError) throw profileError;

    const supabase = await createClient();
    await supabase.rpc("log_audit", {
      p_action: "member.created",
      p_entity_type: "profile",
      p_entity_id: userId,
      p_metadata: { email: parsed.data.email, role: parsed.data.role },
    });

    revalidatePath("/membres");
    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

const updateSchema = z.object({
  member_id: z.uuid(),
  full_name: z.string().trim().min(1, "Nom requis").max(120),
  role: z.enum(["admin", "manager", "member"]),
  phone: z.string().trim().max(40).optional(),
  daily_goal_override: z.coerce.number().int().min(1).max(1000).optional(),
  is_active: z.boolean(),
});

export async function updateMemberAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await requireRole("admin");

    const rawGoal = String(formData.get("daily_goal_override") ?? "").trim();
    const parsed = updateSchema.safeParse({
      member_id: formData.get("member_id"),
      full_name: formData.get("full_name"),
      role: formData.get("role"),
      phone: formData.get("phone") || undefined,
      daily_goal_override: rawGoal || undefined,
      is_active: formData.get("is_active") === "on",
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    // Garde-fou : le chef ne peut pas se rétrograder ni se désactiver
    // lui-même. Sans ça, une app sans admin devient impossible à administrer.
    if (parsed.data.member_id === admin.id) {
      if (parsed.data.role !== "admin" || !parsed.data.is_active) {
        return {
          ok: false,
          error: "Tu ne peux pas retirer ton propre accès administrateur.",
        };
      }
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.full_name,
        role: parsed.data.role,
        phone: parsed.data.phone ?? null,
        daily_goal_override: parsed.data.daily_goal_override ?? null,
        is_active: parsed.data.is_active,
      })
      .eq("id", parsed.data.member_id);
    if (error) throw error;

    await supabase.rpc("log_audit", {
      p_action: "member.updated",
      p_entity_type: "profile",
      p_entity_id: parsed.data.member_id,
      p_metadata: {
        role: parsed.data.role,
        is_active: parsed.data.is_active,
        daily_goal_override: parsed.data.daily_goal_override ?? null,
      },
    });

    revalidatePath("/membres");
    revalidatePath("/equipe");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

// Le chef redonne un mot de passe à quelqu'un qui l'a perdu et qui n'a pas
// accès à sa boîte mail. Il n'y a pas de « voir le mot de passe » : on en
// impose un nouveau, et il est affiché une fois à l'écran de l'admin.
export async function resetMemberPasswordAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireRole("admin");

    const parsed = z
      .object({
        member_id: z.uuid(),
        password: z.string().min(8, "8 caractères minimum"),
      })
      .safeParse({
        member_id: formData.get("member_id"),
        password: formData.get("password"),
      });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(parsed.data.member_id, {
      password: parsed.data.password,
    });
    if (error) throw error;

    const supabase = await createClient();
    await supabase.rpc("log_audit", {
      p_action: "member.password_reset",
      p_entity_type: "profile",
      p_entity_id: parsed.data.member_id,
    });

    revalidatePath("/membres");
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
