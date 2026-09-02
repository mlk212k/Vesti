/**
 * La TVA, à un seul endroit.
 *
 * Tant que Vesti est sous le seuil de la franchise en base (art. 293 B du CGI),
 * il n'y a pas de TVA : ni facturée, ni déclarée, ni reversée. Le jour où le
 * seuil est franchi, une partie de chaque encaissement cesse d'appartenir à
 * l'entreprise — elle est collectée pour l'État et reversée.
 *
 * ⚠️ C'est cette bascule qui rend le fichier nécessaire, et une seule erreur y
 * est vraiment coûteuse : traiter la TVA collectée comme du chiffre d'affaires.
 * Elle gonflerait la marge affichée d'environ 20 %, et surtout elle servirait de
 * base au calcul des commissions de parrainage — on paierait 30 % d'un argent
 * qui ne nous appartient pas, à reverser quand même ensuite. Sur 1 000 abonnés
 * Styliste, cette erreur seule coûte ~900 € par mois.
 *
 * D'où le parti pris : la TVA est retirée AVANT tout autre calcul, et rien en
 * aval n'a besoin de savoir qu'elle existe.
 */

/**
 * TVA active ou non.
 *
 * 🔴 UNE SEULE LIGNE À CHANGER le jour du franchissement de seuil — et c'est
 * volontairement une constante, pas une variable d'environnement. Basculer ce
 * réglage change ce que touchent les partenaires et ce qu'on déclare à l'État :
 * ça mérite un commit daté, relu, et couvert par les tests ci-contre, pas une
 * case cochée dans un tableau de bord un soir.
 *
 * Avant de la passer à `true` : vérifier le seuil en vigueur, et se rappeler
 * qu'il s'apprécie sur l'ENSEMBLE du chiffre d'affaires de la structure, pas
 * sur celui de Vesti seul.
 */
export const VAT_ENABLED = false;

/** Taux normal français. Les services numériques n'ont pas de taux réduit. */
export const VAT_RATE = 0.2;

/**
 * Les prix affichés sont TTC.
 *
 * Ce n'est pas un détail d'implémentation mais une obligation : en B2C, le prix
 * annoncé à un consommateur est le prix qu'il paie, toutes taxes comprises
 * (art. L112-1 du code de la consommation). Conséquence directe : le jour de la
 * bascule, 8,99 € restent 8,99 € pour le client, et c'est la part qui nous
 * revient qui diminue. Facturer 8,99 € + TVA supposerait de monter le prix
 * affiché à 10,79 € — une décision commerciale, pas technique.
 */
export const PRICES_INCLUDE_VAT = true;

/**
 * Taux effectivement appliqué aujourd'hui : 0 tant que la franchise s'applique.
 *
 * Les fonctions ci-dessous acceptent un taux en argument plutôt que de lire la
 * constante directement. Ce n'est pas de la souplesse gratuite : ça permet de
 * TESTER LE COMPORTEMENT AVEC TVA AVANT DE L'ACTIVER. Sans ça, le chemin de code
 * qui compte le plus resterait le seul jamais exercé, et on découvrirait ses
 * erreurs sur les premières vraies factures assujetties.
 */
export function activeVatRate(): number {
  return VAT_ENABLED ? VAT_RATE : 0;
}

/**
 * Part d'un encaissement qui revient réellement à l'entreprise, en centimes.
 *
 * C'est la base de tout ce qui suit : marge, commissions, chiffre d'affaires
 * déclaré. Sur 8,99 € TTC à 20 %, il reste 7,49 € — les 1,50 € de différence
 * transitent simplement par le compte.
 */
export function netCents(grossCents: number, rate = activeVatRate()): number {
  if (!Number.isFinite(grossCents) || !Number.isFinite(rate)) return 0;
  if (rate <= 0) return Math.trunc(grossCents);

  // Symétrique autour de zéro : un remboursement doit annuler exactement
  // l'encaissement qu'il rembourse, au centime près.
  const sign = grossCents < 0 ? -1 : 1;
  const gross = Math.abs(Math.trunc(grossCents));

  return sign * Math.round(gross / (1 + rate));
}

/**
 * TVA collectée sur un encaissement, en centimes.
 *
 * Calculée par DIFFÉRENCE, jamais par une seconde multiplication : c'est ce qui
 * garantit `netCents + vatCents === grossCents` exactement, sans centime perdu
 * ni inventé par deux arrondis indépendants. Un test le vérifie sur toute une
 * plage de montants.
 */
export function vatCents(grossCents: number, rate = activeVatRate()): number {
  if (!Number.isFinite(grossCents) || !Number.isFinite(rate)) return 0;
  return Math.trunc(grossCents) - netCents(grossCents, rate);
}

/** Mention légale à porter sur les factures et les mentions légales. */
export function vatMention(): string {
  return VAT_ENABLED
    ? `TVA ${(VAT_RATE * 100).toFixed(0)} % incluse`
    : "TVA non applicable, art. 293 B du CGI";
}
