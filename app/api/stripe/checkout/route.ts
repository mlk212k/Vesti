import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { priceIdForPlan, statusGrantsAccess } from "@/lib/stripe/plans";
import { createPortalSession } from "@/lib/stripe/portal";
import { linkCustomer } from "@/lib/stripe/sync";
import { PLANS } from "@/lib/plans";
import { env } from "@/lib/env";
import type { Profile } from "@/types/db";

const bodySchema = z.object({
  plan: z.enum(["pro", "styliste"]),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single<Pick<Profile, "stripe_customer_id">>();

  const stripe = getStripe();

  // On réutilise le client Stripe existant s'il y en a un : sans ça, chaque
  // achat créerait un nouveau client et l'historique de facturation serait
  // éparpillé sur plusieurs fiches.
  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await linkCustomer(user.id, customerId);
  }

  // ⚠️ Un abonné qui repasse par le Checkout se retrouverait avec DEUX
  // abonnements actifs, et donc facturé deux fois (8,99 € + 17,99 € = 26,98 €
  // par mois). Le webhook enregistrerait les deux, et le plan affiché
  // dépendrait de l'événement arrivé en dernier.
  //
  // Un changement de formule n'est pas un nouvel achat : c'est une
  // modification de l'abonnement existant, et ça se passe dans le portail
  // Stripe. On le renvoie là-bas plutôt que d'encaisser deux fois.
  //
  // La vérification interroge Stripe et non notre table `subscriptions` :
  // c'est Stripe qui facture, et c'est donc son état qui fait foi, même si un
  // webhook s'est perdu.
  const existing = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  if (existing.data.some((subscription) => statusGrantsAccess(subscription.status))) {
    return NextResponse.json({
      url: await createPortalSession(customerId),
      portal: true,
    });
  }

  // ⚠️ On vérifie que le prix Stripe correspond VRAIMENT au tarif annoncé sur
  // la page avant d'ouvrir le paiement.
  //
  // Les identifiants de prix se ressemblent à s'y méprendre (`price_1UBDIN…`
  // et `price_1UBDId…` ne diffèrent que d'un caractère au milieu) : une
  // inversion dans les variables d'environnement est facile à faire et
  // invisible à la lecture. Elle l'est beaucoup moins pour le client, qui
  // clique « 8,99 € » et se fait débiter 17,99 €.
  //
  // Facturer un montant que l'écran n'annonçait pas est le pire défaut qu'une
  // page de paiement puisse avoir : mieux vaut refuser la vente que la faire
  // au mauvais prix.
  const priceId = priceIdForPlan(parsed.data.plan);
  const price = await stripe.prices.retrieve(priceId);
  const expected = Math.round(PLANS[parsed.data.plan].priceEur * 100);

  if (price.unit_amount !== expected || price.currency !== "eur") {
    console.error("[stripe] prix incohérent avec le tarif annoncé", {
      plan: parsed.data.plan,
      priceId,
      attendu: expected,
      stripe: price.unit_amount,
      devise: price.currency,
    });
    return NextResponse.json({ error: "price_mismatch" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    // Reliera l'abonnement à notre utilisateur côté webhook.
    client_reference_id: user.id,
    locale: "fr",
    allow_promotion_codes: true,
    success_url: `${env.siteUrl}/billing?checkout=success`,
    cancel_url: `${env.siteUrl}/billing?checkout=cancelled`,
  });

  if (!session.url) {
    return NextResponse.json({ error: "checkout_failed" }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
