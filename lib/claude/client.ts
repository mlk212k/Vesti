import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env.server";

/** Modèle unique de l'app. Centralisé pour n'avoir qu'un endroit à changer. */
export const MODEL = "claude-opus-5";

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
