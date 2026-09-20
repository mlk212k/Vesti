"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { actionError, type ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";

// L'abonnement push d'un appareil.
//
// Il s'écrit directement sous RLS : la policy `push_insert_own` impose que
// `user_id` soit celui de la personne connectée. On ne peut donc pas
// abonner le téléphone de quelqu'un d'autre, ni lire ses appareils.
//
// `user_id` n'est pas lu depuis le formulaire mais depuis la session : un
// identifiant qui vient du client n'est jamais une identité.

const abonnement = z.object({
  endpoint: z.url().max(2000),
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(200),
  user_agent: z.string().max(400).optional(),
});

export async function saveSubscriptionAction(
  donnees: z.infer<typeof abonnement>,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = abonnement.safeParse(donnees);
    if (!parsed.success) return { ok: false, error: "Abonnement invalide." };

    const supabase = await createClient();
    // `upsert` sur l'endpoint : réinstaller l'app sur le même téléphone
    // remplace la ligne au lieu d'en créer une deuxième, sans quoi chaque
    // notification arriverait en double.
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.p256dh,
        auth: parsed.data.auth,
        user_agent: parsed.data.user_agent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;

    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

export async function removeSubscriptionAction(
  endpoint: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    const parsed = z.url().max(2000).safeParse(endpoint);
    if (!parsed.success) return { ok: false, error: "Abonnement invalide." };

    const supabase = await createClient();
    // Pas de `.eq("user_id", …)` : la policy `push_delete_own` s'en charge,
    // et elle, on ne peut pas oublier de l'écrire.
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", parsed.data);
    if (error) throw error;

    return { ok: true };
  } catch (error) {
    return actionError(error);
  }
}

// Sert au bouton à savoir dans quel état il doit s'afficher au chargement,
// sans faire confiance au seul `Notification.permission` du navigateur :
// autoriser les notifications sur un téléphone n'abonne pas les autres.
export async function hasSubscriptionAction(endpoint: string): Promise<boolean> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { data } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("endpoint", endpoint)
      .maybeSingle<{ id: string }>();
    return Boolean(data);
  } catch {
    return false;
  }
}
