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
`0001` à `0009` sont déjà appliqués : ne pas les modifier, ajouter un
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

Direction artistique en cours : **CHROME** (l'en-tête de `app/globals.css`
la décrit en entier, y compris ce qu'elle remplace et pourquoi).

Le système visuel tient entièrement dans `app/globals.css` : classes
`panneau`, `panneau-plat`, `panneau-creux`, `dalle`, `lustre`, `champ`,
`btn-primaire`, `metal`, `jauge-cran`, `pastille`, `titre`, `mot`,
`chiffre`, `surtitre`… Utiliser ces classes plutôt que de réinventer des
utilitaires Tailwind au cas par cas — un changement de direction artistique
doit se faire dans ce fichier, pas dans quinze composants. C'est ce qui a
permis de passer de VELOURS à CHROME en changeant des VALEURS, sans toucher
aux dix-sept écrans.

Trois règles de cette DA, qui ne sont pas des préférences :

- **Un seul accent, et c'est une température.** `--os` (beige crème) a
  exactement trois usages : la tranche de la dalle, le chiffre qui
  appartient à la personne qui regarde, ce qui réclame une action
  maintenant. Il fonctionne parce que TOUT le reste est froid — un accent
  chaud sur un écran froid n'a pas besoin d'être vif. Ajouter une couleur
  (un vert de succès, un rouge d'erreur) casse la DA. Une erreur se traite
  par la matière — voir `components/alerte.tsx`.

- **Le lilas répond à une autre question.** `--os` dit « agis / c'est à toi /
  ça cloche » ; `--lilas` dit « c'est vrai en ce moment » — présence, temps
  réel, objectif atteint, barre d'XP pleine. Quand deux états partagent le
  lilas (en tournée / objectif atteint), c'est le MOUVEMENT qui les sépare :
  l'un porte un point qui bat, l'autre non. Jamais une troisième couleur.

- **Une couleur écrite en dur survit à tout changement de DA.** C'est le
  piège n°2 de `scripts/check-tokens.sh`, ajouté parce qu'au passage à CHROME
  six fichiers gardaient la palette précédente — dont un vert acide (#ccff00)
  hérité d'une direction encore antérieure, et l'écran d'erreur global resté
  entièrement en VELOURS. Aucun ne cassait : une couleur en dur reste
  parfaitement valide, et parfaitement fausse. Le vérificateur les refuse
  désormais, sauf dans `app/global-error.tsx` qui n'a pas de feuille de style
  à sa disposition.

- **Deux rampes de chrome, jamais une.** `--chrome-rampe` habille les
  grandes surfaces (la carte) et plonge jusqu'au quasi-noir au milieu :
  c'est cette inversion qui fait lire « métal » plutôt que « plastique ».
  `--chrome-texte` habille les glyphes et ne descend jamais sous `#6e7684`.
  Utiliser la première sur du texte rend le chiffre ILLISIBLE — la bande
  sombre tombe en plein sur les jambages, sur un fond déjà noir. Constaté à
  l'écran, pas déduit.

- **`.metal` ne se pose que sur du 24 px et plus**, et jamais sur un chiffre
  en `text-os` : l'accent a un sens (« c'est ton argent »), le métal en a un
  autre (« c'est un total »). Les deux sur le même nombre n'en disent aucun.
- **Aucune bordure qui fait le tour.** La séparation vient de la profondeur
  (`inset 0 1px 0` en haut d'un plan, une ombre diffuse), pas d'un cadre.
  Un `border` de quatre côtés sur un panneau est un bug de DA.
- **Tout mouvement a une cause.** Une animation répond à un geste ou à un
  changement d'état. Pas de glow décoratif, pas de dégradé gratuit.

**Aucune couleur écrite à la main dans du JSX.** Un `stroke="var(--x)"` ou
un `accent-[var(--x)]` échappe à toute migration de classes, et une variable
morte ne casse rien au build : elle devient invalide en silence. Préférer
les utilitaires (`text-os`, `bg-os`) et lancer `./scripts/check-tokens.sh`
après tout changement de palette.

Deux pièges déjà rencontrés dans ce fichier, à ne pas réintroduire :

- **Masques multi-couches.** Une couche `repeat-x` ne couvre que la hauteur
  de sa tuile ; composée en `intersect` avec une autre bande, elle ne laisse
  **rien** d'opaque et le panneau disparaît entièrement. Il faut un aplat
  opaque en couche du dessous et un `exclude` qui y perce les trous.
  Toujours vérifier un masque à l'écran, pas seulement à la lecture.
- **Césure.** `overflow-wrap: break-word` est global pour que du texte saisi
  ne déborde pas, mais il couperait « COMMISSION » en « COMMISSI / ON ». Les
  libellés courts passent par `.surtitre-serre`, qui remet
  `overflow-wrap: normal` et `word-break: keep-all`.

Pas de librairie d'icônes, de graphiques ni d'animation : `components/icons.tsx`
et `components/graphiques.tsx` sont maison, et `components/dalle.tsx` fait
ses gestes à la main.

**Le mouvement de cette DA tient en une phrase :** le métal ne bouge pas,
c'est la lumière qui passe dessus. Rien ne glisse, ne rebondit ni ne
clignote — ce sont des reflets qui traversent des surfaces immobiles
(`.lustre` sur la carte, `coule-metal` dans les chiffres, `passe-bouton`
sur le bouton principal, `passe-vernis` sur l'écran). Une animation qui
déplace un ÉLÉMENT plutôt qu'un reflet est probablement hors direction.

Deux conséquences pratiques :

- **`.dalle` n'a plus de pseudo-élément libre.** `::before` porte le liseré
  irisé, `::after` la tranche qui se charge. Toute couche supplémentaire
  passe par un vrai élément — c'est pour ça que `.lustre` est un `<span>`.
- **Une capture prise juste après une navigation montre une page floue.**
  C'est `entree-ecran`, pas un bug de rendu. Attendre ~3 s (un
  `browser_wait_for`) avant toute capture Playwright.

## Une constante partagée ne vit pas dans un module client

Quand un composant SERVEUR importe une valeur ordinaire — un tableau, un
objet, une constante — depuis un module marqué `"use client"`, Next ne lui
donne pas la valeur : il lui donne une **référence** au module client, un
objet opaque destiné au navigateur. Le tableau perd son `.map()`, et la page
plante à l'exécution avec `TypeError: X.map is not a function`.

Rien ne le signale : les types sont justes, le build passe, l'erreur
n'apparaît qu'en ouvrant la page. La page Planning a vécu ainsi, cassée,
jusqu'à ce qu'on la charge réellement dans un navigateur.

Les constantes partagées vont donc dans un module NEUTRE, sans directive —
`lib/planning.ts` par exemple — que les deux côtés importent. Un module
`"use client"` n'exporte que des composants et des hooks.

## L'objet

`components/dalle.tsx` est le cœur de la DA. Trois choses à savoir avant d'y
toucher :

1. **Rien ne passe par `state`.** Un `setState` par `pointermove`, c'est
   soixante rendus React par seconde pour un objet qui n'a aucune donnée à
   recalculer. Tout s'écrit directement dans le style de l'élément et dans
   des variables CSS (`--lx`, `--ly`, `--charge`, `--progression`).
2. **L'inertie est une vraie intégration**, pas une transition CSS : on
   mesure la vitesse angulaire de fin de geste et on la laisse décroître
   dans une boucle `requestAnimationFrame` avant de rendre la main au
   ressort CSS.
3. **Les boucles d'images ne tournent que pendant le contact.** Une boucle
   permanente pour surveiller un appui qui n'a pas commencé, c'est de la
   batterie brûlée.

La dalle ne calcule rien de métier : `charge` lui arrive déjà cuite depuis
le serveur. Si un jour elle calcule un montant, c'est un bug.

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

## Direction créative

Le brief de DA et la liste des connecteurs à mobiliser vivent dans
`../DIRECTION-CREATIVE.md`. Deux points de ce document s'appliquent
directement ici :

- **Un écran n'est pas fini tant qu'il n'a pas été ouvert.** Le build était
  vert pendant que la page Planning plantait, et pendant que sept variables
  CSS mortes rendaient des éléments invisibles. `tsc`, `eslint` et
  `next build` ne voient rien de tout ça.
- **`./scripts/check-tokens.sh` fait partie de la sortie**, au même titre
  que le lint.
