/**
 * Liens d'affiliation sur les produits recommandés.
 *
 * ── Pourquoi ça existe ──────────────────────────────────────────────────────
 *
 * Le plan Styliste produit déjà le travail le plus dur : identifier ce qui
 * manque à une garde-robe, puis trouver de vraies pièces en ligne. Jusqu'ici on
 * offrait cette intention d'achat aux marchands sans rien retenir.
 *
 * C'est un problème de marge, pas d'avidité. Un Styliste à 17,99 € laisse
 * 3,46 € de marge plancher parce que la recherche produits coûte douze fois
 * plus cher qu'un verdict — 0,397 $ contre 0,034 $. Une commission d'affiliation
 * est le seul revenu du produit qui ne soit PAS proportionnel au coût des
 * appels au modèle : sur un panier à 80 €, 5 % rapportent 4 €, soit davantage
 * que la marge de l'abonnement qui a généré le clic.
 *
 * ── Le parti pris : aucun identifiant écrit en dur ──────────────────────────
 *
 * ⚠️ Les identifiants marchands d'un réseau d'affiliation NE SONT PAS
 * devinables. Ils sont attribués compte par compte, après acceptation du
 * programme, et ils diffèrent d'un pays à l'autre pour une même enseigne. Un
 * numéro inventé ne produit pas une erreur visible : il produit un lien qui
 * redirige mal, ou qui crédite quelqu'un d'autre. C'est exactement le genre de
 * défaut qui ne se voit qu'au moment de constater qu'aucune commission n'est
 * jamais tombée.
 *
 * Donc rien ici n'est deviné. La table des marchands est de la CONFIGURATION :
 * tant qu'elle est vide, chaque lien ressort strictement inchangé et le produit
 * se comporte exactement comme avant. Voir `.env.example`.
 *
 * ── Où c'est appliqué ───────────────────────────────────────────────────────
 *
 * Au RENDU (`components/shopping/product-card.tsx`), jamais au stockage. Deux
 * raisons, et la seconde est la plus importante :
 *
 *  1. Un seul endroit rend les liens sortants, donc un seul endroit à traiter.
 *  2. La base garde l'URL d'origine. Le jour où le réseau change, où un
 *     programme est résilié, ou où l'identifiant tourne, les lignes déjà
 *     enregistrées ne deviennent pas de vieux liens morts — elles repassent par
 *     la règle du moment. Transformer avant d'écrire fige une décision
 *     commerciale dans des données qu'on ne peut plus corriger.
 *
 * Les recommandations d'achat étant réservées au plan Styliste
 * (`hasFeature(plan, "shopping")`), l'affiliation ne touche que ce plan sans
 * qu'aucun test de plan soit nécessaire ici.
 */

/** Réseau d'affiliation, tel qu'on sait fabriquer ses liens. */
export interface AffiliateConfig {
  /** Identifiant éditeur Awin (un seul par compte). Vide = tout est inerte. */
  awinAffiliateId?: string;
  /**
   * Domaine marchand → identifiant Awin de CE marchand (`awinmid`).
   *
   * Un marchand absent de cette table n'est jamais transformé : mieux vaut un
   * lien direct non rémunéré qu'un lien d'affiliation faux.
   */
  merchants: ReadonlyMap<string, string>;
}

/**
 * Lit la table « domaine:identifiant » de la configuration.
 *
 * Format : `asos.com:1234,hm.com:5678,zalando.fr:9012`
 *
 * Volontairement permissif sur la forme — espaces, virgules en trop, casse du
 * domaine — et strict sur le fond : une entrée incomplète est ignorée plutôt
 * que devinée. Une ligne mal copiée depuis un tableau de bord ne doit pas
 * produire un lien à moitié correct.
 */
export function parseMerchantMap(raw: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!raw) return map;

  for (const entry of raw.split(",")) {
    const [domain, id] = entry.split(":");
    const host = domain?.trim().toLowerCase().replace(/^www\./, "");
    const mid = id?.trim();
    // Les deux moitiés sont obligatoires : un domaine sans identifiant ne peut
    // rien construire, un identifiant sans domaine ne s'applique à rien.
    if (host && mid) map.set(host, mid);
  }

  return map;
}

/**
 * Le marchand configuré qui correspond à cet hôte, s'il y en a un.
 *
 * ⚠️ La comparaison se fait sur une frontière de point, jamais sur un simple
 * `includes`. Sans ça, `faux-asos.com` correspondrait à `asos.com` et on
 * enverrait des acheteurs sur une redirection d'affiliation depuis un site
 * qui n'est pas celui du programme.
 */
export function matchMerchant(
  hostname: string,
  merchants: ReadonlyMap<string, string>
): string | null {
  const host = hostname.toLowerCase().replace(/^www\./, "");

  for (const [domain, mid] of merchants) {
    if (host === domain || host.endsWith(`.${domain}`)) return mid;
  }

  return null;
}

/** Hôte des liens Awin déjà construits, pour ne jamais en envelopper un second. */
const AWIN_HOST = "awin1.com";

/**
 * L'URL à mettre dans le lien, affiliée quand c'est possible et licite.
 *
 * Rend TOUJOURS quelque chose d'utilisable : au moindre doute — URL illisible,
 * configuration absente, marchand inconnu, lien déjà affilié — elle rend
 * l'original. Un lien direct fait perdre une commission ; un lien cassé fait
 * perdre l'acheteur, et c'est bien plus cher.
 */
export function affiliateUrl(url: string, config: AffiliateConfig): string {
  const { awinAffiliateId, merchants } = config;
  if (!awinAffiliateId || merchants.size === 0) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Le schéma valide pourtant `z.string().url()` en amont, mais cette
    // fonction est appelée sur des données stockées il y a des mois : on ne
    // suppose pas que la validation d'hier a la forme d'aujourd'hui.
    return url;
  }

  // Seuls le web ordinaire passe. Un `javascript:` ou un `data:` n'a rien à
  // faire dans un href sortant, affilié ou non.
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return url;

  // Déjà passé par le réseau : le réenvelopper produirait une redirection en
  // cascade, que les réseaux refusent de créditer.
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  if (host === AWIN_HOST || host.endsWith(`.${AWIN_HOST}`)) return url;

  const merchantId = matchMerchant(parsed.hostname, merchants);
  if (!merchantId) return url;

  // `ued` (= « url encoded destination ») porte la page d'arrivée. Elle DOIT
  // être encodée : une URL produit contient presque toujours des `&` de
  // paramètres, qui couperaient le lien d'affiliation en deux sans ça.
  const deepLink = new URL("https://www.awin1.com/cread.php");
  deepLink.searchParams.set("awinmid", merchantId);
  deepLink.searchParams.set("awinaffid", awinAffiliateId);
  deepLink.searchParams.set("ued", parsed.toString());

  return deepLink.toString();
}
