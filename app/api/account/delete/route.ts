import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";
import { OUTFITS_BUCKET } from "@/lib/supabase/storage";
import {
  collectStoragePaths,
  isDeletionConfirmed,
  type AnalysisExport,
  type ItemExport,
} from "@/lib/account";
import type { Profile } from "@/types/db";

const bodySchema = z.object({
  confirmation: z.string(),
});

export const maxDuration = 120;

/**
 * Suppression du compte (RGPD art. 17).
 *
 * L'ORDRE DES OPÉRATIONS EST LE CŒUR DE CETTE ROUTE :
 *
 *  1. annuler l'abonnement Stripe — après la suppression du profil, on aurait
 *     perdu le `stripe_customer_id` et on continuerait à prélever quelqu'un dont
 *     le compte n'existe plus ;
 *  2. effacer les fichiers du Storage — la suppression en cascade de Postgres
 *     ne touche pas au stockage : sans cette étape, les photos de la personne
 *     resteraient en ligne ;
 *  3. supprimer l'utilisateur, ce qui fait tomber en cascade profil, analyses,
 *     garde-robe, suggestions et abonnements.
 *
 * Inverser 1 et 3, ou oublier 2, laisse des données ou des prélèvements
 * orphelins — les deux étant exactement ce que le droit à l'effacement interdit.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isDeletionConfirmed(parsed.data.confirmation)) {
    return NextResponse.json({ error: "confirmation_invalide" }, { status: 400 });
  }

  const [{ data: profile }, { data: analyses }, { data: items }] = await Promise.all([
    supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single<Pick<Profile, "stripe_customer_id">>(),
    supabase.from("analyses").select("image_paths").eq("user_id", user.id),
    supabase.from("dressing_items").select("source_image_path").eq("user_id", user.id),
  ]);

  const admin = createAdminClient();

  // --- 1. Abonnement Stripe ------------------------------------------------
  if (profile?.stripe_customer_id) {
    try {
      const stripe = getStripe();
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "active",
        limit: 10,
      });
      for (const subscription of subscriptions.data) {
        await stripe.subscriptions.cancel(subscription.id);
      }
    } catch (error) {
      // On interrompt : mieux vaut un compte encore vivant qu'un compte
      // supprimé dont la carte continue d'être débitée.
      console.error("[account] annulation Stripe impossible", error);
      return NextResponse.json(
        {
          error: "stripe_failed",
          message: {
            title: "Suppression interrompue",
            body: "Ton abonnement n'a pas pu être annulé. Rien n'a été supprimé — écris-nous pour qu'on règle ça à la main.",
          },
        },
        { status: 502 }
      );
    }
  }

  // --- 2. Photos dans le Storage ------------------------------------------
  const paths = collectStoragePaths(
    (analyses ?? []) as AnalysisExport[],
    (items ?? []) as ItemExport[]
  );

  if (paths.length > 0) {
    const { error } = await admin.storage.from(OUTFITS_BUCKET).remove(paths);
    if (error) {
      console.error("[account] suppression des photos impossible", error);
      return NextResponse.json(
        {
          error: "storage_failed",
          message: {
            title: "Suppression interrompue",
            body: "Tes photos n'ont pas pu être effacées. Rien n'a été supprimé — écris-nous.",
          },
        },
        { status: 502 }
      );
    }
  }

  // --- 3. Compte et données liées (cascade) --------------------------------
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("[account] suppression du compte impossible", error);
    return NextResponse.json(
      {
        error: "delete_failed",
        message: {
          title: "Suppression incomplète",
          body: "Tes photos ont été effacées mais le compte subsiste. Écris-nous pour finaliser.",
        },
      },
      { status: 502 }
    );
  }

  await supabase.auth.signOut();

  return NextResponse.json({ deleted: true });
}
