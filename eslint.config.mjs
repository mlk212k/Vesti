import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Outillage d'assistant, pas du code d'application : les skills installés
    // sous `.claude/` embarquent leurs propres scripts (`.cjs`, Python) écrits
    // selon d'autres conventions. Sans cette ligne, `npm run lint` sort 15
    // erreurs qui ne concernent pas Vesti et que personne ici ne peut corriger
    // — elles appartiennent au dépôt d'origine du skill.
    ".claude/**",

    // club-app/ is a separate, independent Next.js project (its own
    // package.json, tsconfig, eslint config) that happens to live in this
    // repo. It lints and type-checks itself; the root config must not walk
    // into it.
    "club-app/**",
  ]),
]);

export default eslintConfig;
