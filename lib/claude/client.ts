import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env.server";

/** Modèle unique de l'app. Centralisé pour n'avoir qu'un endroit à changer. */
export const MODEL = "claude-opus-5";

/**
 * Effort de réflexion accordé au modèle.
 *
 * Sans réglage, l'API travaille à `high`. Mesuré sur de vraies analyses, ça
 * représentait 1 300 à 2 100 tokens de sortie pour un verdict de quelques
 * phrases : l'essentiel partait en réflexion, facturée au tarif de sortie.
 *
 * Deux niveaux, parce que les deux familles d'appels n'ont pas les mêmes
 * exigences :
 *
 *  - VERDICT : ce que le client lit. Un cran sous le défaut seulement — c'est
 *    la valeur du produit, on ne la brade pas pour trois centimes.
 *  - UTILITY : de l'extraction mécanique (retrouver des produits achetables à
 *    partir d'une description). Rien à arbitrer, rien à nuancer.
 *
 * ⚠️ C'est un réglage de QUALITÉ avant d'être un réglage de coût ou de vitesse.
 * Le verdict est ce que le client paie ; s'il devient plat ou générique, on a
 * gagné dix secondes et perdu le produit.
 *
 * 🔴 REPASSÉ À `medium` APRÈS UNE RÉGRESSION MESURÉE. Ne pas rebaisser sans
 * lire ce qui suit.
 *
 * L'essai en `low` avait tout l'air d'un succès : sortie −44 %, coût divisé
 * par deux, et des verdicts jugés « toujours aussi détaillés » à la lecture.
 * Les chiffres en base disaient autre chose :
 *
 *   effort medium — 11 analyses — scores 42 à 76, bien répartis
 *   effort low    —  3 analyses — scores 58, 58, 58
 *
 * Le TEXTE tenait, la NOTE s'était effondrée sur une valeur par défaut.
 * Rédiger un verdict ne demande pas de délibération ; arbitrer un chiffre
 * entre 0 et 100, si. Le premier survit à la baisse d'effort, le second non.
 *
 * ⚠️ La leçon vaut au-delà de ce réglage : on surveillait la qualité visible
 * et la dégradation est passée par une dimension que personne ne regardait.
 * Une note identique trois fois de suite ne se voit pas en lisant une analyse
 * — elle se voit en comparant plusieurs analyses en base.
 *
 * Pour détecter la même panne à l'avenir :
 *   select stddev_samp(score) from analyses where created_at > now() - '7 days';
 * Un écart-type qui s'écrase (< 5) veut dire que la note ne distingue plus
 * rien, quelle qu'en soit la cause.
 */
export const VERDICT_EFFORT = "medium" as const;
export const UTILITY_EFFORT = "low" as const;

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!client) {
    const workspaceId = serverEnv.anthropicWorkspaceId;

    client = new Anthropic({
      apiKey: serverEnv.anthropicApiKey,

      // Anthropic distingue deux sortes de clés. Une clé de console classique
      // est déjà rattachée à un espace de travail et se suffit à elle-même.
      // Une clé « liée à une identité », elle, exige que chaque requête dise
      // dans quel espace elle agit, sinon l'API répond :
      //
      //   anthropic-workspace-id is required when authenticating with an
      //   identity-linked API key
      //
      // L'en-tête n'est donc envoyé que si la variable existe : l'ajouter à
      // vide ferait échouer une clé classique qui, elle, marchait très bien.
      ...(workspaceId
        ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } }
        : {}),
    });
  }
  return client;
}
