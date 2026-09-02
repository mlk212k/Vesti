import "server-only";

import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planFromPriceId, statusGrantsAccess } from "./plans";
import type { Plan } from "@/lib/plans";

/**
 * Applique l'état d'un abonnement Stripe à notre base.
 *
 * Écrit avec le service_role : `profiles.plan` est délibérément hors de portée
 * du client (cf. 0002_rls.sql), seul le serveur peut l'accorder.
 *
 * Idempotent par construction : on écrit un état complet, jamais un delta. Un
 * même event rejoué produit exactement le même résultat.
 */
export async function applySubscription(subscription: Stripe.Subscription): Promise<void> {
  const admin = createAdminClient();

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle<{ id: string }>();

  if (!profile) {
    // Client Stripe inconnu de notre base : on ne devine pas à qui l'attribuer.
    console.error("[stripe] abonnement sans profil correspondant", { customerId });
    return;
  }

  const item = subscription.items.data[0];
  const priceId = item?.price?.id ?? null;

  // Depuis l'API 2025+, la période de facturation vit sur l'item d'abonnement
  // et non plus sur l'abonnement lui-même.
  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  const plan: Plan = statusGrantsAccess(subscription.status)
    ? planFromPriceId(priceId)
    : "free";

  await admin.from("subscriptions").upsert(
    {
      user_id: profile.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      stripe_price_id: priceId,
      plan,
      status: subscription.status,
      current_period_end: periodEnd,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );

  await admin.from("profiles").update({ plan }).eq("id", profile.id);
}

/** Rattache un client Stripe à un profil (première commande). */
export async function linkCustomer(userId: string, customerId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
}

/** Violation de contrainte d'unicité côté Postgres. */
const UNIQUE_VIOLATION = "23505";

export type ClaimOutcome = "claimed" | "duplicate" | "error";

/**
 * Marque un event Stripe comme pris en charge.
 *
 * Stripe rejoue les events (retries, incidents réseau) : sans ce verrou, un
 * rejeu réappliquerait le changement de plan et, plus tard, pourrait doubler un
 * envoi d'email ou un crédit. L'insertion sert de réservation atomique.
 *
 * On distingue impérativement le doublon d'une panne : confondre les deux
 * ferait répondre 200 à Stripe alors que rien n'a été traité. Stripe ne
 * rejouerait jamais l'event et un client ayant payé resterait sans son plan.
 */
export async function claimEvent(eventId: string, type: string): Promise<ClaimOutcome> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("stripe_events")
    .insert({ id: eventId, type })
    .select("id");

  if (error) {
    return error.code === UNIQUE_VIOLATION ? "duplicate" : "error";
  }

  return (data?.length ?? 0) > 0 ? "claimed" : "duplicate";
}

/**
 * Libère un event dont le traitement a échoué, pour que le rejeu de Stripe
 * puisse le reprendre. Sans ça, un incident transitoire laisserait un client
 * payant sans son plan.
 */
export async function releaseEvent(eventId: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("stripe_events").delete().eq("id", eventId);
}
