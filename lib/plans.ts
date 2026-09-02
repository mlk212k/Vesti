/**
 * Définition des plans, côté application.
 *
 * ⚠️ La source de vérité de l'ENFORCEMENT est le SQL
 * (`plan_analysis_limit()` / `plan_allows_dressing()` dans
 * supabase/migrations/0003_quota_rpc.sql) : c'est lui qui décide réellement si
 * un appel Claude part ou non. Ce fichier ne sert qu'à l'affichage (pricing,
 * badge de quota, paywalls). Les deux doivent rester alignés — un test SQL
 * (supabase/tests/01_quota_and_rls.sql) échoue si les chiffres divergent.
 */

export type Plan = "free" | "pro" | "styliste";

export interface PlanFeatures {
  /** Analyse complète du dressing + suggestions de tenues à partir de l'existant */
  dressing: boolean;
  /** Historique et suivi de progression */
  history: boolean;
  /** Recommandations d'achat + suggestions météo/occasion */
  shopping: boolean;
}

export interface PlanDefinition {
  id: Plan;
  name: string;
  tagline: string;
  priceEur: number;
  /** Reflet de plan_analysis_limit() en SQL. Sur les plans payants, il s'agit
   *  d'un garde-fou fair-use, pas d'une limite commerciale mise en avant. */
  analysesPerMonth: number;
  /** true = communiqué comme « illimité », le plafond restant un anti-abus */
  unlimitedMessaging: boolean;
  features: PlanFeatures;
}

export const PLANS: Record<Plan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Découverte",
    tagline: "Teste le styliste",
    priceEur: 0,
    analysesPerMonth: 3,
    unlimitedMessaging: false,
    features: { dressing: false, history: false, shopping: false },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Ton dressing, exploité à fond",
    priceEur: 8.99,
    analysesPerMonth: 150,
    unlimitedMessaging: true,
    features: { dressing: true, history: true, shopping: false },
  },
  styliste: {
    id: "styliste",
    name: "Styliste",
    tagline: "Ton styliste personnel complet",
    priceEur: 17.99,
    analysesPerMonth: 300,
    unlimitedMessaging: true,
    features: { dressing: true, history: true, shopping: true },
  },
};

export const PLAN_ORDER: Plan[] = ["free", "pro", "styliste"];

export function isPlan(value: string): value is Plan {
  return value === "free" || value === "pro" || value === "styliste";
}

export function hasFeature(plan: Plan, feature: keyof PlanFeatures): boolean {
  return PLANS[plan].features[feature];
}

/** Plan minimum à vendre pour débloquer une fonctionnalité donnée. */
export function requiredPlanFor(feature: keyof PlanFeatures): Plan {
  return PLAN_ORDER.find((plan) => PLANS[plan].features[feature]) ?? "styliste";
}

export function formatPrice(plan: Plan): string {
  const { priceEur } = PLANS[plan];
  return priceEur === 0
    ? "Gratuit"
    : `${priceEur.toFixed(2).replace(".", ",")} €/mois`;
}
