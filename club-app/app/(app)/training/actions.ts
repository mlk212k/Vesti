"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireRole } from "@/lib/auth";

const specificities = [
  "general",
  "gardiens",
  "defenseurs",
  "milieux",
  "attaquants",
] as const;

const specificityLabels: Record<(typeof specificities)[number], string> = {
  general: "Groupe entier (généraliste)",
  gardiens: "Gardiens de but",
  defenseurs: "Défenseurs",
  milieux: "Milieux de terrain",
  attaquants: "Attaquants",
};

const planSchema = z.object({
  team: z.string().trim().min(1).max(80),
  specificity: z.enum(specificities),
  duration: z.coerce.number().int().min(20).max(180),
  theme: z.string().trim().min(1).max(300),
  playerCount: z.coerce.number().int().min(1).max(40).optional(),
});

export type PlanResult = { plan: string } | { error: string };

export async function generateTrainingPlanAction(
  _prev: PlanResult | undefined,
  formData: FormData,
): Promise<PlanResult> {
  await requireRole("admin", "coach");

  const parsed = planSchema.safeParse({
    team: formData.get("team"),
    specificity: formData.get("specificity"),
    duration: formData.get("duration"),
    theme: formData.get("theme"),
    playerCount: formData.get("playerCount") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }
  const { team, specificity, duration, theme, playerCount } = parsed.data;

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      error:
        "Clé API Anthropic non configurée sur le serveur (variable ANTHROPIC_API_KEY manquante).",
    };
  }

  const client = new Anthropic();

  const userPrompt = [
    `Équipe / catégorie : ${team}`,
    `Spécificité : ${specificityLabels[specificity]}`,
    `Durée totale : ${duration} minutes`,
    playerCount ? `Effectif présent : ${playerCount} joueurs` : null,
    `Thème / objectif de la séance : ${theme}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4000,
      system:
        "Tu es un entraîneur de football diplômé qui aide des coachs de club amateur à préparer des séances d'entraînement. " +
        "Réponds toujours en français, dans un format prêt à imprimer, structuré avec des titres Markdown : " +
        "## Échauffement, ## Ateliers techniques/tactiques (chaque atelier avec durée, objectif, description, matériel, consignes), " +
        "## Situation finale / jeu réduit, ## Retour au calme. " +
        "Adapte le contenu de manière concrète à la spécificité demandée (un entraînement gardiens ne ressemble pas à un " +
        "entraînement milieux) et à la catégorie d'âge indiquée (intensité, complexité, durée des ateliers adaptées à l'âge). " +
        "Reste réaliste sur le temps total : la somme des durées des blocs doit correspondre à la durée totale demandée. " +
        "Sois concret et actionnable : un coach doit pouvoir l'exécuter sans préparation supplémentaire.",
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    if (!text) {
      return { error: "Réponse vide de l'IA, réessaie." };
    }

    return { plan: text };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { error: "Clé API Anthropic invalide ou révoquée." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { error: "Limite de requêtes atteinte, réessaie dans un instant." };
    }
    if (err instanceof Anthropic.APIError) {
      return { error: `Erreur API Anthropic : ${err.message}` };
    }
    return { error: "Une erreur inattendue est survenue." };
  }
}
