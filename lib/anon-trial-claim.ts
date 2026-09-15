import "server-only";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ANON_TRIAL_COOKIE } from "@/lib/anon-trial";

/**
 * Recopie l'essai sans compte dans le compte qui vient d'être créé.
 *
 * ⚠️ C'EST CETTE FONCTION QUI REND VRAIE LA PHRASE « garde ce verdict ». Elle
 * est la contrepartie d'une promesse faite à l'écran, pas une commodité : si
 * elle disparaît, l'écran `TrialSignup` ment, et il faut le réécrire le même
 * jour.
 *
 * ── Ce qui est délibéré ─────────────────────────────────────────────────────
 *
 * Appelée à la SORTIE de l'onboarding — les deux sorties, le formulaire rempli
 * comme le formulaire passé. C'est le moment où quelqu'un qui vient de l'essai
 * arrive forcément, et il n'y en a pas d'autre qui les couvre tous les deux.
 *
 * Quelqu'un qui se CONNECTE à un compte existant après un essai n'est pas
 * couvert : il ne repasse pas par l'onboarding. C'est assumé — il a déjà ses
 * analyses, et son essai n'était qu'un coup d'œil. Le couvrir demanderait de
 * greffer la réclamation sur chaque chemin d'authentification, pour un cas qui
 * ne perd rien d'important.
 *
 * ⚠️ Le cookie est retiré DANS TOUS LES CAS, y compris quand rien n'a été
 * réclamé. Le laisser ferait retenter la réclamation à chaque passage, et
 * surtout : un essai déjà consommé garderait son jeton dans le navigateur,
 * donnant à la personne l'impression d'avoir encore un essai en réserve.
 *
 * Silencieuse en cas d'échec. Elle s'exécute au milieu de la création d'un
 * compte ; faire échouer une inscription parce qu'un verdict d'essai n'a pas pu
 * être recopié coûterait le client pour sauver le souvenir.
 */
export async function claimTrialForCurrentUser(): Promise<void> {
  try {
    const jar = await cookies();
    const trialId = jar.get(ANON_TRIAL_COOKIE)?.value;
    if (!trialId) return;

    jar.delete(ANON_TRIAL_COOKIE);

    // La RPC vérifie elle-même `auth.uid()`, que l'essai n'est pas déjà
    // réclamé, et qu'il porte bien un verdict. Elle ne rend rien dans les
    // autres cas — réclamer deux fois est normal, pas une erreur.
    const supabase = await createClient();
    await supabase.rpc("claim_anon_trial", { p_trial: trialId });
  } catch {
    // Voir plus haut : jamais au prix de l'inscription.
  }
}
