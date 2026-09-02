import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { priceIdForPlan } from "@/lib/stripe/plans";
import { linkCustomer } from "@/lib/stripe/sync";
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

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceIdForPlan(parsed.data.plan), quantity: 1 }],
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
