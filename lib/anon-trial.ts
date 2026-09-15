import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

/**
 * L'essai sans compte : ses limites, et de quoi les faire respecter.
 *
 * ── Ce que ce fichier protège ───────────────────────────────────────────────
 *
 * Chaque essai est un appel au modèle payé sans contrepartie. Mesuré sur les
 * analyses réelles : 0,039 $ le verdict. Une boucle sur cette route, lancée par
 * une seule personne un samedi soir, vide le budget du mois pendant que
 * personne ne regarde.
 *
 * Trois limites, et chacune couvre ce que les autres laissent passer :
 *
 *  1. UNE par jeton. Le cookie identifie le navigateur. Se contourne en le
 *     supprimant — donc à lui seul, il ne protège de rien.
 *  2. Quelques-unes par adresse IP. Couvre le cas du cookie effacé. Se contourne
 *     avec un VPN ou un partage de connexion mobile, donc ne suffit pas non plus.
 *  3. ⚠️ UN PLAFOND GLOBAL QUOTIDIEN. Celui-là est le vrai garde-fou : quoi
 *     qu'on contourne, la dépense de la journée est bornée. Les deux premiers
 *     servent à ce que ce plafond ne soit pas mangé par une seule personne.
 *
 * Les trois sont comptées EN SQL dans `reserve_anon_trial`, dans une seule
 * transaction avec un verrou. Compter côté application laisserait passer dix
 * requêtes simultanées qui lisent toutes « il reste de la place » avant que
 * l'une ait écrit — précisément ce que fait une attaque.
 */

/** Le cookie qui porte le jeton d'essai. Lu côté serveur uniquement. */
export const ANON_TRIAL_COOKIE = "vesti_essai";

/** Un mois : assez pour qu'un essai fait le lundi se réclame le vendredi. */
export const ANON_TRIAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Les plafonds, réglables sans redéploiement.
 *
 * ⚠️ Les valeurs par défaut sont VOLONTAIREMENT BASSES. 150 essais par jour,
 * c'est environ 6 $ — une somme qu'on peut perdre sans que ça change quoi que
 * ce soit. Sur la dernière campagne (700 visiteurs en un jour, 28 clics), 150
 * essais représenteraient déjà cinq fois le nombre de gens qui franchissaient
 * la porte. Le plafond se relève quand on aura vu ce que ça donne ; il ne se
 * relève pas « au cas où », parce que l'erreur dans ce sens se paie en argent
 * réel et se découvre sur une facture.
 */
export const MAX_TRIALS_PER_DAY = readCap("ANON_TRIAL_MAX_PER_DAY", 150);
export const MAX_TRIALS_PER_IP_PER_DAY = readCap("ANON_TRIAL_MAX_PER_IP", 3);

function readCap(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

/**
 * L'empreinte d'une adresse IP.
 *
 * ⚠️ On ne stocke JAMAIS l'adresse. Une IP est une donnée personnelle, et on
 * n'a besoin que de savoir si deux essais viennent du même endroit — pas d'où.
 * Le sel vient d'un secret serveur : sans lui, une empreinte se casse en
 * quelques secondes, l'espace des adresses IPv4 tenant dans une table.
 *
 * `null` quand l'adresse est illisible. La fonction SQL traite ce cas comme une
 * adresse à part entière, partagée par tous les inconnus, plutôt que comme une
 * absence de limite.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = serverEnv.supabaseServiceRoleKey;
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

/**
 * L'adresse du visiteur, telle que l'hébergeur la rapporte.
 *
 * `x-forwarded-for` peut contenir une liste ; la première entrée est le client,
 * les suivantes sont les relais traversés. ⚠️ Cet en-tête est falsifiable par
 * qui veut — raison de plus pour que la limite par IP ne soit pas la seule.
 */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip");
}

/**
 * Le dossier de stockage d'un essai.
 *
 * Préfixé `anon/` : les photos d'essai vivent à part de celles des comptes, ce
 * qui permet de les purger sans risquer d'emporter celles de quelqu'un.
 */
export function buildAnonPath(trialId: string, extension: string): string {
  const safe = /^[a-z0-9]{2,5}$/.test(extension) ? extension : "jpg";
  return `anon/${trialId}/${randomUUID()}.${safe}`;
}

/**
 * Le chemin appartient-il bien à cet essai ?
 *
 * Le client renvoie le chemin de la photo qu'il a envoyée ; sans cette
 * vérification, il pourrait en donner un autre — celui d'un compte, par
 * exemple — et faire analyser la photo de quelqu'un d'autre.
 */
export function pathBelongsToTrial(path: string, trialId: string): boolean {
  return path.startsWith(`anon/${trialId}/`);
}

export type TrialRefusal = "daily_cap" | "ip_cap";

/** Ce que le visiteur doit lire quand un plafond est atteint. */
export function trialRefusalMessage(refusal: TrialRefusal): string {
  // ⚠️ Aucun des deux ne dit « tu as dépassé ta limite » : dans les deux cas la
  // personne n'a rien fait de mal, et l'essai gratuit n'est pas un dû qu'on lui
  // retire. On lui propose la seule chose qui marche encore — le compte, qui a
  // ses propres analyses offertes.
  if (refusal === "ip_cap") {
    return "Plusieurs essais ont déjà été lancés depuis ta connexion. Crée un compte pour continuer, c'est gratuit.";
  }
  return "Les essais gratuits du jour sont tous partis. Crée un compte pour analyser ta tenue maintenant, c'est gratuit.";
}
