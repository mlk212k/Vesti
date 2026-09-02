import "server-only";

import Stripe from "stripe";
import { serverEnv } from "@/lib/env.server";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    // On laisse le SDK choisir sa version d'API par défaut : la figer ici la
    // désynchroniserait des types embarqués à chaque montée de version.
    stripe = new Stripe(serverEnv.stripeSecretKey, { typescript: true });
  }
  return stripe;
}
