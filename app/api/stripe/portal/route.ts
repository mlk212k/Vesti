import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe/portal";
import type { Profile } from "@/types/db";

/**
 * Portail client Stripe : changement de formule, moyen de paiement, factures,
 * résiliation. Tout passe par lui plutôt que par des écrans maison — les
 * proratas d'upgrade/downgrade et la conformité facturation sont gérés par
 * Stripe, les recoder serait long et fragile.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single<Pick<Profile, "stripe_customer_id">>();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "no_customer" }, { status: 400 });
  }

  return NextResponse.json({
    url: await createPortalSession(profile.stripe_customer_id),
  });
}
