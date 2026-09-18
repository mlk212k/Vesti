import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "./config";

const VAPID_SUBJECT = "https://guentrange.vercel.app";

let configured = false;

// Returns false when VAPID_PRIVATE_KEY isn't set — callers should treat
// that as "notifications are off" and skip sending, not as an error.
export function configureWebPush(): boolean {
  if (configured) return true;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Sends to one already-known subscription (no DB lookup) — used both by
// sendPushToUser below and directly by the training-reminders cron, which
// fetches subscriptions in bulk via its own RPC. Never throws: the caller
// decides what a dead subscription means for its own DB access path.
export async function sendPushPayload(
  subscription: PushSubscriptionRow,
  payload: PushPayload,
): Promise<{ ok: boolean; dead: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true, dead: false };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    return { ok: false, dead: statusCode === 404 || statusCode === 410 };
  }
}

// Best-effort: a notification failing to send must never break the action
// that triggered it (e.g. convoking a player), so every failure mode here
// is swallowed rather than thrown. `supabase` is the cookie-based client
// for the signed-in member's request (e.g. a coach convoking a player) —
// looks up that user's subscriptions via RLS-gated RPC first.
export async function sendPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: PushPayload,
) {
  try {
    if (!configureWebPush()) return;

    const { data: subs } = await supabase.rpc("get_push_subscriptions", {
      target_user_id: userId,
    });
    if (!subs?.length) return;

    await Promise.all(
      (subs as PushSubscriptionRow[]).map(async (sub) => {
        const { dead } = await sendPushPayload(sub, payload);
        if (dead) {
          await supabase.rpc("delete_push_subscription", {
            p_endpoint: sub.endpoint,
          });
        }
      }),
    );
  } catch {
    // Notifications are a nice-to-have side effect of convoking a player;
    // never let a push/network hiccup fail that primary action.
  }
}
