import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Le garde-fou de la marge.
 *
 * ⚠️ Pourquoi les plafonds d'analyses ne suffisaient pas : ils comptent des
 * ACTES, pas des EUROS. Une analyse coûte 0,034 $ sans recherche produits et
 * 0,397 $ avec — douze fois plus. Compter les actes pour maîtriser une dépense,
 * c'est compter les tickets de caisse pour tenir un budget.
 *
 * Ici on compte l'argent. Chaque appel coûteux s'enregistre, et les fonctions
 * qui coûtent cher se taisent quand l'enveloppe du mois est vide.
 *
 * 🔑 La dégradation est ordonnée, et c'est le point de conception : ce qu'on
 * coupe en premier, ce sont les liens d'achat. Le verdict — ce que l'abonné
 * vient chercher — passe toujours. Un budget qui ferait échouer l'analyse
 * elle-même transformerait une protection de marge en panne de produit.
 */
export type SpendKind = "verdict" | "product_search" | "dressing" | "daily";

/**
 * Reste-t-il de quoi payer une opération coûteuse ce mois-ci ?
 *
 * En cas de doute — lecture impossible, profil introuvable — on répond OUI.
 * Refuser sur une erreur de lecture priverait un abonné payant d'une fonction
 * qu'il a payée, pour un incident qui n'est pas le sien. Le risque financier
 * d'un faux « oui » est d'une recherche ; celui d'un faux « non » est un client
 * qui ne comprend pas ce qu'il achète.
 */
export async function hasBudgetLeft(userId: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("ai_budget_remaining", { p_user: userId });

    if (error || data === null || data === undefined) return true;
    return Number(data) > 0;
  } catch {
    return true;
  }
}

/**
 * Inscrit une dépense au registre.
 *
 * Volontairement silencieuse en cas d'échec : elle est appelée APRÈS que le
 * travail a été rendu. Faire échouer une réponse déjà produite parce que sa
 * comptabilité n'a pas pu s'écrire serait absurde — on perdrait le service ET
 * l'argent déjà dépensé.
 *
 * ⚠️ Une écriture perdue sous-estime la dépense, donc relâche le garde-fou.
 * C'est le bon sens de l'erreur ici, mais ça vaut d'être su.
 */
export async function recordSpend(
  userId: string,
  kind: SpendKind,
  micros: number
): Promise<void> {
  if (!Number.isFinite(micros) || micros <= 0) return;

  try {
    const admin = createAdminClient();
    await admin.rpc("record_ai_spend", {
      p_user: userId,
      p_kind: kind,
      p_micros: Math.round(micros),
    });
  } catch (error) {
    console.error("[budget] dépense non enregistrée", error);
  }
}
