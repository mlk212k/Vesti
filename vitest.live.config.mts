import { defineConfig } from "vitest/config";

/**
 * Configuration de l'essai réel contre l'API (`*.manual.test.ts`).
 *
 * `server-only` refuse d'être importé hors d'un composant serveur — c'est la
 * garde qui empêche une clé de fuir dans le bundle navigateur. Elle est ici
 * neutralisée pour ce seul fichier de configuration, jamais pour le build.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: /^server-only$/, replacement: new URL("vitest.server-only-stub.ts", import.meta.url).pathname },
    ],
  },
  test: { environment: "node", include: ["**/*.manual.test.ts"] },
});
