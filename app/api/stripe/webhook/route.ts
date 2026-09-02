import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { serverEnv } from "@/lib/env.server";
import {
  applySubscription,
  claimEvent,
  linkCustomer,
  releaseEvent,
} from "@/lib/stripe/sync";

/**
 * Webhook Stripe : c'est ici, et nulle part ailleurs, que le plan d'un
 * utilisateur change. Le retour de Checkout côté navigateur n'est qu'un
 * affichage : l'utilisateur peut fermer l'onglet avant, ou forger l'URL.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // La signature se vérifie sur le corps BRUT : le parser en JSON d'abord
  // invaliderait le calcul (espaces et ordre des clés comptent).
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      serverEnv.stripeWebhookSecret
    );
  } catch {
    // Signature invalide = requête non émise par Stripe.
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // Réservation atomique : un event déjà traité ressort en 200 sans rien
  // réappliquer, tandis qu'une panne de base ressort en 500 pour que Stripe
  // rejoue — répondre 200 dans ce cas perdrait l'event définitivement.
  const claim = await claimEvent(event.id, event.type);
  if (claim === "duplicate") {
    return NextResponse.json({ received: true, deduplicated: true });
  }
  if (claim === "error") {
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    // On relâche la réservation pour que le rejeu de Stripe reprenne l'event,
    // et on répond 500 pour déclencher ce rejeu.
    await releaseEvent(event.id);
    console.error("[stripe] échec du traitement", event.type, error);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  const stripe = getStripe();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId =
        typeof session.customer === "string" ? session.customer : session.customer?.id;

      if (userId && customerId) {
        await linkCustomer(userId, customerId);
      }

      // La session ne porte pas l'état complet de l'abonnement : on le relit
      // pour écrire un état de référence plutôt qu'un état partiel.
      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await applySubscription(subscription);
      }
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Sur `deleted`, le statut de l'objet vaut `canceled` : applySubscription
      // en déduit le retour au plan gratuit, pas besoin de cas séparé.
      await applySubscription(event.data.object as Stripe.Subscription);
      break;
    }

    default:
      // Les autres events sont acquittés sans traitement.
      break;
  }
}
