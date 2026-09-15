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
 * ── D'où vient le 50, et pourquoi pas plus ──────────────────────────────────
 *
 * 50 essais ≈ 2 $ par jour. Le chiffre vient des comptes réels, pas d'une
 * intuition : à ce jour, ZÉRO abonné payant sur 39 comptes, et 4,24 $ de
 * dépense modèle sur tout le mois. Chaque euro sort donc de la poche de
 * l'éditeur, sans rien en face.
 *
 * ⚠️ Un premier jet portait ce plafond à 150, soit ~6 $/jour — c'est-à-dire
 * PLUS, chaque jour, que ce que le produit entier avait coûté depuis le début
 * du mois. Le chiffre avait été choisi pour être « perdable » sans regarder
 * s'il y avait un revenu en face. Il n'y en a pas.
 *
 * Ce que ce plafond achète est une information : est-ce que montrer le produit
 * avant de demander le compte fait s'inscrire ? 50 essais dont 15 comptes créés
 * donnent 30 % contre les 3,7 % mesurés — un écart qu'on ne confond pas avec du
 * bruit. Il n'en faut pas davantage pour décider.
 *
 * ⚠️ ET LE PLAFOND GLOBAL PEUT SE RETOURNER CONTRE NOUS. Quelqu'un qui brûle
 * les essais de la nuit laisse la campagne du lendemain matin sans rien à
 * offrir. La limite par IP rend la manœuvre pénible, pas impossible. C'est une
 * raison de plus de ne pas confondre « plafond haut » et « protection » : le
 * plafond borne la casse, il ne l'empêche pas.
 *
 * Il se relève en variable d'environnement, après avoir regardé ce que la
 * veille a coûté — jamais « au cas où ». L'erreur dans ce sens se découvre sur
 * une facture, et ne se rattrape pas.
 */
export const MAX_TRIALS_PER_DAY = readCap("ANON_TRIAL_MAX_PER_DAY", 50);
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
