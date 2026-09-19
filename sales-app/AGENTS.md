<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Notes pour `sales-app`

Application Next.js 16 **autonome** : son `package.json`, son
`node_modules`, son projet Supabase, son déploiement. Ne rien importer
depuis `../`.

Next 16, les pièges qui comptent ici :

- `cookies()`, `headers()`, `params`, `searchParams` sont **asynchrones**.
- `middleware.ts` s'appelle `proxy.ts` (fonction `proxy`), runtime Node.
- `next lint` n'existe plus : `npm run lint` appelle `eslint` directement.
- La règle `react-hooks/set-state-in-effect` est **active et bloquante**.
  Pour refermer un panneau après une action réussie, utiliser
  `lib/use-panneau.ts` (ajustement d'état pendant le rendu), jamais un
  `setState` dans un `useEffect`.

## La règle qui prime sur toutes les autres

**Aucun calcul financier côté client.** Le montant, la commission et le net
sont des colonnes générées de `sales`. Le formulaire de vente affiche un
aperçu par confort ; si cet aperçu était faux, la base n'en tiendrait aucun
compte. Ne jamais ajouter de colonne « montant » écrite par l'application.

De même, aucune valeur métier en dur : le taux, l'objectif, le prix par
défaut et la retenue vivent dans `app_settings`. Si un `10` ou un `0.1`
apparaît dans un composant, c'est un bug.

## Où écrire quoi

| Besoin | Endroit |
|---|---|
| Argent, stock, journées | fonction SQL `security definer` dans `supabase/migrations/` |
| Fiches commerce, messages, notifications | écriture directe sous RLS |
| Lecture | `lib/queries.ts`, avec le client porteur de session |
| Message d'erreur | `lib/errors.ts` — les fonctions SQL lèvent des codes stables (`NOT_ENOUGH_CARDS`), traduits à un seul endroit |

Les tables `sales`, `work_days`, `card_movements`, `card_allocations`,
`audit_logs` n'ont **aucune policy d'INSERT/UPDATE**, et c'est délibéré :
c'est ce qui rend impossible la fabrication d'une vente depuis un client.
Ne pas « réparer » ça en ajoutant une policy.

## Migrations

`supabase/migrations/` est la source de vérité du schéma. Les fichiers
`0001` à `0007` sont déjà appliqués : ne pas les modifier, ajouter un
nouveau fichier numéroté.

Après toute modification du schéma, mettre à jour `lib/types.ts` (les types
sont écrits à la main, pas générés) et relancer :

```bash
./scripts/test-db.sh
```

Ce script rejoue tout le schéma sur une base vierge et exécute les
assertions de `supabase/tests/01_regles.sql`. Il a déjà attrapé trois bugs
réels que la relecture n'avait pas vus — ne pas livrer une migration sans
l'avoir lancé.

Les tests se font passer pour un utilisateur via le rôle `authenticated` et
une revendication JWT. Tester en superutilisateur ne teste rien : la RLS ne
s'applique pas à lui.

## Design

Le système visuel tient entièrement dans `app/globals.css` : classes
`panneau`, `panneau-heros`, `champ`, `btn-primaire`, `jauge`, `pastille`,
`titre`, `chiffre`… Utiliser ces classes plutôt que de réinventer des
utilitaires Tailwind au cas par cas — un changement de direction artistique
doit se faire dans ce fichier, pas dans quinze composants.

Pas de librairie d'icônes ni de graphiques : `components/icons.tsx` et
`components/graphiques.tsx` sont maison, et rendus côté serveur.
