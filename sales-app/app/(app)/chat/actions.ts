"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { conversationIdSchema } from "@/lib/chat";
import { actionError, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// Les messages s'insèrent directement : la policy `messages_insert` exige
// d'être membre de la conversation ET d'être l'auteur déclaré. On ne peut
// donc ni écrire ailleurs, ni signer du nom d'un autre.
//
// Un trigger (`handle_new_message`) remonte la conversation et crée les
// notifications des autres participants.

export async function sendMessageAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const parsed = z
      .object({
        // `conversationIdSchema` et non `z.uuid()` : voir lib/chat.ts —
        // l'identifiant de la conversation d'équipe n'est pas un UUID
        // conforme, et la validation stricte le refusait.
        conversation_id: conversationIdSchema,
        body: z.string().trim().min(1, "Message vide").max(4000),
      })
      .safeParse({
        conversation_id: formData.get("conversation_id"),
        body: formData.get("body"),
      });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Message invalide" };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("messages").insert({
      conversation_id: parsed.data.conversation_id,
      author_id: user.id,
      body: parsed.data.body,
    });
    if (error) throw error;

    revalidatePath(`/chat/${parsed.data.conversation_id}`);
    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

// Ouvre (ou retrouve) la conversation privée avec quelqu'un, puis y emmène.
export async function openDirectConversationAction(formData: FormData) {
  const user = await requireUser();
  const other = z.uuid().safeParse(formData.get("member_id"));
  if (!other.success || other.data === user.id) redirect("/chat");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_or_create_direct_conversation", {
    p_other: other.data,
  });
  if (error || !data) redirect("/chat");

  redirect(`/chat/${data}`);
}

export async function markConversationReadAction(
  conversationId: string,
): Promise<void> {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
}

// Réactions. Recliquer sur le même emoji le retire : c'est le comportement
// attendu partout ailleurs, et ça évite une deuxième interaction pour
// annuler une tape ratée.
export async function toggleReactionAction(
  messageId: string,
  emoji: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const parsed = z
      .object({
        message_id: conversationIdSchema,
        emoji: z.string().min(1).max(12),
      })
      .safeParse({ message_id: messageId, emoji });

    if (!parsed.success) return { ok: false, error: "Réaction invalide." };

    const supabase = await createClient();

    const { data: existante } = await supabase
      .from("message_reactions")
      .select("emoji")
      .eq("message_id", parsed.data.message_id)
      .eq("user_id", user.id)
      .eq("emoji", parsed.data.emoji)
      .maybeSingle<{ emoji: string }>();

    if (existante) {
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("message_id", parsed.data.message_id)
        .eq("user_id", user.id)
        .eq("emoji", parsed.data.emoji);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("message_reactions").insert({
        message_id: parsed.data.message_id,
        user_id: user.id,
        emoji: parsed.data.emoji,
      });
      if (error) throw error;
    }

    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}
