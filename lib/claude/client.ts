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
 * 📉 Passé de `medium` à `low`, et VÉRIFIÉ en production plutôt que supposé :
 *
 *   sortie   1 400 → 779 tokens   (−44 %)
 *   coût     0,059 → 0,029 $      (moitié, l'entrée ayant aussi baissé grâce
 *                                  à la photo réduite avant envoi)
 *   verdicts jugés toujours aussi détaillés sur de vraies analyses
 *
 * C'est ce dernier point qui autorise les deux autres. Le raccourci tentant
 * serait de lire « −44 % de sortie » comme un pur gain : c'est d'abord 44 % de
 * texte en moins dans ce que le client paie. Ici la qualité a tenu — mais si
 * un jour les verdicts s'aplatissent, c'est cette ligne qu'on remonte EN
 * PREMIER, avant d'aller chercher des économies ailleurs.
 */
export const VERDICT_EFFORT = "low" as const;
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
