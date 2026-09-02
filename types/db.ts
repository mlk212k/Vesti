/**
 * Types de la base. À terme, remplacer par la génération automatique :
 *   npx supabase gen types typescript --project-id <ref> > types/db.ts
 * En attendant, ce fichier reflète supabase/migrations/0001_schema.sql.
 */

export type Plan = "free" | "pro" | "styliste";
export type AnalysisKind = "outfit" | "dressing";
export type Gender = "femme" | "homme" | "non-binaire" | "non-precise";
export type Morphology =
  | "sablier"
  | "triangle"
  | "triangle-inverse"
  | "rectangle"
  | "ovale"
  | "non-precise";
export type ItemCategory =
  | "haut"
  | "bas"
  | "robe"
  | "veste"
  | "chaussures"
  | "accessoire"
  | "autre";

export interface Profile {
  id: string;
  email: string | null;
  /** Prénom, saisi à l'onboarding. Facultatif : l'étape se passe. */
  first_name: string | null;
  gender: Gender | null;
  height_cm: number | null;
  /** Facultatif : sert aux proportions, jamais restitué à l'utilisateur. */
  weight_kg: number | null;
  morphology: Morphology | null;
  style_prefs: string[];
  onboarded_at: string | null;
  plan: Plan;
  analyses_used: number;
  period_start: string;
  stripe_customer_id: string | null;
  /** Partenaire à l'origine de l'inscription. Écrit par redeem_referral_code(). */
  referral_code: string | null;
  referred_at: string | null;
  /** Solde de Style. Écrit uniquement par les fonctions SQL du parrainage. */
  style_balance: number;
  /** Code personnel à partager, généré à l'inscription. */
  own_code: string | null;
  /** Utilisateur parrain. Écrit une seule fois par redeem_style_code(). */
  referred_by: string | null;
  referred_by_at: string | null;
  /** Date du versement au parrain : sa présence interdit un second versement. */
  referral_rewarded_at: string | null;
  /** Plan offert par le parrainage. Distinct de `plan`, qui appartient à Stripe. */
  gift_plan: Plan | null;
  gift_plan_until: string | null;
  /** Position arrondie (~1 km), uniquement pour la météo du jour. */
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  created_at: string;
}

/** Colonnes que le client a le droit de mettre à jour (cf. 0002_rls.sql, 0005). */
export type ProfileOnboardingUpdate = Partial<
  Pick<
    Profile,
    | "first_name"
    | "gender"
    | "height_cm"
    | "weight_kg"
    | "morphology"
    | "style_prefs"
    | "onboarded_at"
  >
>;

export interface ReferralCode {
  code: string;
  partner_name: string;
  channel: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
}

/** Retour de public.referral_stats — attribution par partenaire (usage interne). */
export interface ReferralStats {
  code: string;
  partner_name: string;
  channel: string | null;
  active: boolean;
  signups: number;
  paying_customers: number;
  signups_30d: number;
  last_signup_at: string | null;
}

export interface Analysis {
  id: string;
  user_id: string;
  kind: AnalysisKind;
  image_paths: string[];
  verdict: unknown;
  score: number | null;
  occasion: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
}

export interface DressingItem {
  id: string;
  user_id: string;
  analysis_id: string | null;
  category: ItemCategory;
  label: string;
  color: string | null;
  season: "toutes" | "ete" | "hiver" | "mi-saison" | null;
  image_path: string | null;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id: string | null;
  plan: Plan;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/** Retour de public.consume_analysis_quota() */
export interface QuotaConsumption {
  allowed: boolean;
  reason:
    | "unauthenticated"
    | "invalid_kind"
    | "no_profile"
    | "plan_required"
    | "quota_exceeded"
    | "fair_use_reached"
    | null;
  used_count: number;
  limit_total: number;
  remaining: number;
  plan_code: Plan;
}

/** Retour de public.get_quota_status() */
export interface QuotaStatus {
  used_count: number;
  limit_total: number;
  remaining: number;
  plan_code: Plan;
  period_end: string;
}
