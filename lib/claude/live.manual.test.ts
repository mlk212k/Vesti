/**
 * Essai réel contre l'API Anthropic.
 *
 * ⚠️ Ce fichier n'est PAS lancé par `npm run test` : son nom porte `.manual.`,
 * exclu de la configuration Vitest. Il consomme des tokens facturés, et un banc
 * d'essai qui dépense de l'argent à chaque commit est un banc d'essai qu'on
 * finit par désactiver.
 *
 * À lancer à la main, avec une clé :
 *   ANTHROPIC_API_KEY=... npx vitest run lib/claude/live.manual.test.ts
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeOutfit, OutfitAnalysisRefused } from "./analyze-outfit";

const PHOTO = process.env.PHOTO;

describe("analyse réelle", () => {
  it("répond sur une vraie requête à l'API", async () => {
    const data = readFileSync(PHOTO!).toString("base64");

    try {
      const result = await analyzeOutfit(
        { kind: "base64", data, mediaType: "image/jpeg" },
        {
          gender: "homme",
          height_cm: 180,
          weight_kg: 75,
          morphology: "rectangle",
          style_prefs: [],
        }
      );

      console.log("\n=== VERDICT ===");
      console.log(JSON.stringify(result.analysis, null, 2));
      console.log("=== TOKENS ===", JSON.stringify(result.usage), result.model);
      expect(result.analysis.garments.length).toBeGreaterThan(0);
    } catch (error) {
      // Refus attendu sur une photo hors sujet : c'est un succès du point de
      // vue de la chaîne, pas un échec.
      if (error instanceof OutfitAnalysisRefused) {
        console.log("\n=== PHOTO REFUSÉE (comportement attendu hors tenue) ===");
        return;
      }
      throw error;
    }
  }, 120_000);
});
