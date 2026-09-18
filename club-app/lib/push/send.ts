import "server-only";
import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";
import { VAPID_PUBLIC_KEY } from "./config";

const VAPID_SUBJECT = "https://guentrange.vercel.app";

let configured = false;
function ensureConfigured(privateKey: string) {
  if (configured) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
  configured = true;
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

// Best-effort: a notification failing to send must never break the action
// that triggered it (e.g. convoking a player), so every failure mode here
// is swallowed rather than thrown.
export async function sendPushToUser(userId: string, payload: PushPayload) {
  try {
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!privateKey) return;
    ensureConfigured(privateKey);

    const supabase = await createClient();
    const { data: subs } = await supabase.rpc("get_push_subscriptions", {
      target_user_id: userId,
    });
    if (!subs?.length) return;

    await Promise.all(
      (subs as PushSubscriptionRow[]).map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload),
          );
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await supabase.rpc("delete_push_subscription", {
              p_endpoint: sub.endpoint,
            });
          }
        }
      }),
    );
  } catch {
    // Notifications are a nice-to-have side effect of convoking a player;
    // never let a push/network hiccup fail that primary action.
  }
}
