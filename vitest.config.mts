import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // `*.manual.test.ts` appelle l'API Anthropic pour de vrai : facturé, lent,
    // et dépendant du réseau. Il se lance à la main avec vitest.live.config.mts.
    // Un banc d'essai qui dépense de l'argent à chaque commit finit désactivé.
    exclude: ["**/node_modules/**", "**/*.manual.test.ts"],
  },
});
