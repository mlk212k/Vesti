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
| Disponibilités, relances | `availabilities` sous RLS, `send_nudge` pour la relance (limite d'une heure côté base) |
| Message d'erreur | `lib/errors.ts` — les fonctions SQL lèvent des codes stables (`NOT_ENOUGH_CARDS`), traduits à un seul endroit |

Les tables `sales`, `work_days`, `card_movements`, `card_allocations`,
`audit_logs` n'ont **aucune policy d'INSERT/UPDATE**, et c'est délibéré :
c'est ce qui rend impossible la fabrication d'une vente depuis un client.
Ne pas « réparer » ça en ajoutant une policy.

## Migrations

`supabase/migrations/` est la source de vérité du schéma. Les fichiers
`0001` à `0008` sont déjà appliqués : ne pas les modifier, ajouter un
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
`ticket`, `panneau`, `perfo`, `ligne-ticket`, `tampon`, `champ`,
`btn-primaire`, `jauge-cran`, `pastille`, `titre`, `chiffre`, `surtitre`…
Utiliser ces classes plutôt que de réinventer des utilitaires Tailwind au
cas par cas — un changement de direction artistique doit se faire dans ce
fichier, pas dans quinze composants.

Deux pièges déjà rencontrés dans ce fichier, à ne pas réintroduire :

- **Masques multi-couches.** Les crans de `.ticket` sont découpés au
  `mask-image`. Une couche `repeat-x` ne couvre que la hauteur de sa tuile ;
  composée en `intersect` avec une autre bande, elle ne laisse **rien**
  d'opaque et le panneau disparaît entièrement. D'où l'aplat
  `linear-gradient(#000, #000)` en couche du dessous et le `exclude` qui y
  perce les trous. Toujours vérifier un masque à l'écran, pas seulement à la
  lecture.
- **Césure.** `overflow-wrap: break-word` est global pour que du texte saisi
  ne déborde pas, mais il couperait « COMMISSION » en « COMMISSI / ON ». Les
  libellés courts passent par `.surtitre-serre`, qui remet
  `overflow-wrap: normal` et `word-break: keep-all` : le libellé passe à la
  ligne entre deux mots, jamais au milieu d'un.

Pas de librairie d'icônes ni de graphiques : `components/icons.tsx` et
`components/graphiques.tsx` sont maison, et rendus côté serveur.

## Sons

`lib/sfx.ts` synthétise six sons courts en Web Audio ; aucun fichier audio
n'est livré. Trois règles :

1. Le son part sur le **résultat** de l'action, jamais sur le clic — un
   tampon qui retentit alors que l'ouverture de journée a échoué est un
   mensonge sonore.
2. Le `AudioContext` se crée au premier son, donc après un geste de
   l'utilisateur ; le créer au chargement le laisserait suspendu.
3. Le réglage vit dans `localStorage` et se lit avec `useSyncExternalStore`
   (`abonnerSons` / `lireSons` / `lireSonsServeur`), pas avec un `useState`
   rempli dans un effet : la règle `react-hooks/set-state-in-effect` le
   refuse.

## Identifiants de conversation

Le fil d'équipe porte un identifiant choisi à la main,
`00000000-0000-0000-0000-000000000001`. Ce n'est pas un UUID conforme à la
RFC 4122 : ses quartets de version et de variante sont nuls. Zod 4 les
vérifie dans `z.uuid()`, qui le rejette — d'où `z.guid()` dans `lib/chat.ts`,
qui ne contrôle que la forme. Valider un identifiant de conversation
ailleurs avec `z.uuid()` casse le chat d'équipe, et lui seul.
