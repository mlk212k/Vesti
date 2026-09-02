import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StyleStatus } from "@/lib/style";

/**
 * Lit l'état du programme pour l'utilisateur connecté.
 *
 * Les deux compteurs de filleuls sont volontairement distincts : afficher
 * seulement le total ferait croire à un bug le jour où quelqu'un a parrainé
 * cinq personnes et n'a que 20 Style. Séparer « confirmés » et « en attente »
 * explique l'écart au lieu de le laisser passer pour une erreur.
 */
export async function getStyleStatus(): Promise<StyleStatus | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("style_balance, own_code, gift_plan_until, referred_by")
    .eq("id", user.id)
    .single<{
      style_balance: number;
      own_code: string | null;
      gift_plan_until: string | null;
      referred_by: string | null;
    }>();

  if (!profile) return null;

  // La RLS n'autorise à lire que son propre profil : le décompte des filleuls
  // passe donc par la clé de service, filtrée explicitement sur cet utilisateur.
  const admin = createAdminClient();
  const { data: filleuls } = await admin
    .from("profiles")
    .select("referral_rewarded_at")
    .eq("referred_by", user.id);

  // Commissions : lues via la fonction SQL, qui filtre déjà sur l'utilisateur.
  const { data: earnings } = await supabase.rpc("referral_earnings_summary");
  const summary = (earnings as
    | { total_cents: number; referred_paying: number }[]
    | null)?.[0];

  const rows = filleuls ?? [];
  const confirmed = rows.filter((r) => r.referral_rewarded_at !== null).length;

  return {
    balance: profile.style_balance ?? 0,
    code: profile.own_code,
    confirmedReferrals: confirmed,
    pendingReferrals: rows.length - confirmed,
    giftUntil: profile.gift_plan_until,
    referred: profile.referred_by !== null,
    earningsCents: Number(summary?.total_cents ?? 0),
    payingReferrals: summary?.referred_paying ?? 0,
  };
}

/**
 * Verse au parrain les Style dus, après une analyse réellement effectuée.
 *
 * ⚠️ Ne jamais exposer ça au navigateur : le versement n'a de sens que déclenché
 * par le serveur qui vient de constater l'analyse. C'est pour ça que la fonction
 * SQL prend l'utilisateur en paramètre et n'est appelable qu'avec la clé de
 * service — voir la migration 0010.
 *
 * Sans effet si l'utilisateur n'a pas de parrain ou si le versement a déjà eu
 * lieu : appelable à chaque analyse sans condition côté appelant.
 */
export async function awardReferralStyle(userId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("award_referral_style", { p_user: userId });

  // Un parrainage non crédité ne doit pas faire échouer une analyse déjà rendue :
  // le verdict est le produit, le Style est un bonus. On journalise et on passe.
  if (error) {
    console.error("[style] versement du parrainage impossible", error);
  }
}
