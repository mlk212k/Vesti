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

    // Composants installés depuis un registre shadcn tiers. Même raison que
    // ci-dessus : ce code vient d'ailleurs, il se fait réécrire mot pour mot à
    // chaque `shadcn add`, et le corriger ici ne survivrait pas à la première
    // mise à jour.
    //
    // ⚠️ Ce que l'exclusion CACHE, pour qu'on le sache : `dock.tsx` lit
    // `iconRefs.current[i]` pendant le rendu, ce que `react-hooks/refs`
    // interdit à raison. Ce n'est pas un faux positif. Tant que le composant
    // n'est pas monté dans un écran, ça ne coûte rien ; le jour où il le sera,
    // c'est la première chose à vérifier sous React Compiler.
    "components/unlumen-ui/**",
  ]),
]);

export default eslintConfig;
