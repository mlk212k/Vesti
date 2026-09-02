import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env.server";

/** Modèle unique de l'app. Centralisé pour n'avoir qu'un endroit à changer. */
export const MODEL = "claude-opus-5";

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: serverEnv.anthropicApiKey });
  }
  return client;
}
