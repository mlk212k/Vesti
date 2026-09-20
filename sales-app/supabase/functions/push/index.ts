// Fonction Edge « push ».
//
// Appelée UNIQUEMENT par le trigger `notifications_push` (migration 0009),
// via pg_net, juste après l'insertion d'une notification. Son travail :
// retrouver les appareils de la personne concernée et leur remettre le
// message signé et chiffré.
//
// AUTHENTIFICATION : `verify_jwt` est désactivé — le trigger Postgres n'a
// pas de JWT utilisateur à présenter. À la place, il envoie un secret
// partagé dans l'en-tête `x-arena-secret`, comparé ici à celui rangé dans
// le Vault. Sans lui, la fonction refuse tout, y compris un appel direct
// depuis Internet.
//
// NETTOYAGE : un service de push répond 404 ou 410 quand un abonnement est
// mort (app désinstallée, navigateur réinitialisé). On supprime alors la
// ligne — sinon la table se remplit d'appareils fantômes et chaque envoi
// coûte des requêtes pour rien.

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const URL_SUPABASE = Deno.env.get("SUPABASE_URL")!;
const CLE_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = createClient(URL_SUPABASE, CLE_SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Secrets = { name: string; decrypted_secret: string };

let secrets: Record<string, string> | null = null;

async function lireSecrets(): Promise<Record<string, string>> {
  if (secrets) return secrets;
  const { data, error } = await db
    .schema("vault")
    .from("decrypted_secrets")
    .select("name, decrypted_secret")
    .returns<Secrets[]>();
  if (error) throw error;
  const table: Record<string, string> = {};
  for (const ligne of data ?? []) table[ligne.name] = ligne.decrypted_secret;
  secrets = table;
  return table;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let config: Record<string, string>;
  try {
    config = await lireSecrets();
  } catch {
    return new Response("Secrets indisponibles", { status: 500 });
  }

  const attendu = config["push_shared_secret"];
  if (!attendu || req.headers.get("x-arena-secret") !== attendu) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { notification_id: notificationId } = await req.json().catch(() => ({}));
  if (typeof notificationId !== "string") {
    return new Response("notification_id manquant", { status: 400 });
  }

  const { data: notification } = await db
    .from("notifications")
    .select("id, user_id, title, body, link")
    .eq("id", notificationId)
    .maybeSingle();

  if (!notification) {
    return new Response(JSON.stringify({ envoyes: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: abonnements } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", notification.user_id);

  if (!abonnements?.length) {
    return new Response(JSON.stringify({ envoyes: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(
    config["vapid_subject"] ?? "mailto:contact@example.com",
    config["vapid_public_key"],
    config["vapid_private_key"],
  );

  const charge = JSON.stringify({
    title: notification.title,
    body: notification.body ?? "",
    link: notification.link ?? "/",
    tag: notification.id,
  });

  let envoyes = 0;
  const morts: string[] = [];

  await Promise.all(
    abonnements.map(async (abo) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: abo.endpoint,
            keys: { p256dh: abo.p256dh, auth: abo.auth },
          },
          charge,
        );
        envoyes += 1;
      } catch (erreur) {
        const code = (erreur as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) morts.push(abo.id);
      }
    }),
  );

  if (morts.length) {
    await db.from("push_subscriptions").delete().in("id", morts);
  }

  if (envoyes) {
    await db
      .from("push_subscriptions")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_id", notification.user_id);
  }

  return new Response(JSON.stringify({ envoyes, supprimes: morts.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
