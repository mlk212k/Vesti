<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Notes pour `radio-tripoint`

Site de **Radio Tripoint** (radio et média des Trois Frontières). Application
Next.js 16 **autonome** : son `package.json`, son `node_modules`, son
déploiement. Ne rien importer depuis `../` — et le dépôt parent (Vesti)
exclut ce dossier de son `tsc` et de son `eslint`.

## La règle qui prime : ne rien inventer

Aucun horaire, animateur, chiffre d'audience, partenaire, événement,
réseau social ou URL de flux n'est écrit sans source. Une information
manquante reste `null` / `[]` / `""` et s'affiche « à venir » ou « à
compléter ». Le contenu de démonstration (`data/demo/`) est fictif, badgé
« Exemple », exclu du sitemap, en `noindex`, et ne se charge qu'avec
`NEXT_PUBLIC_DEMO_CONTENT=1` : **jamais en production**.

## Où écrire quoi

| Besoin                                              | Endroit                                          |
| --------------------------------------------------- | ------------------------------------------------ |
| Coordonnées, visuels (logo, hero), mentions légales | `config/site.ts`                                 |
| Flux, player Radioking, titre en cours              | `.env` → `config/radioConfig.ts`                 |
| Réseaux sociaux                                     | `config/socialLinks.ts`                          |
| Mesure d'audience (déclenche le bandeau cookies)    | `config/analytics.ts`                            |
| Émissions et grille horaire                         | `data/shows.ts`                                  |
| Articles, épisodes, événements                      | `data/*.ts` — ou un CMS derrière `lib/contenu/*` |
| Couleurs, typo, composants visuels                  | `app/globals.css` (jetons + classes)             |

`lib/contenu/*` est le **seul** point de lecture du contenu. Brancher un CMS
= réécrire ces fonctions (déjà asynchrones), sans toucher aux pages.

## Design : trois règles

- **Le rouge `--direct` est réservé au direct.** Bouton d'écoute, point
  « en direct ». Pas une erreur (→ `--alerte`), pas une promo.
- **`--accent` porte la marque** et changera quand le logo officiel sera
  fourni : on modifie sa valeur dans `globals.css`, nulle part ailleurs.
- **Le motif tripoint est orienté comme le terrain** : ouest (FR/LU), nord
  (Moselle, LU/DE), sud-est (FR/DE). Ne pas le « symétriser ».

## Pièges payés pendant la construction

- **`<input type="hidden">` et React.** Sa valeur EST l'attribut `value`,
  que React réécrit à chaque rendu : un horodatage anti-robot posé dans un
  effet était effacé dès l'affichage des erreurs, et le serveur renvoyait un
  faux succès à un humain. L'horodatage vit dans une ref, ajoutée au
  `FormData` à l'envoi (`components/forms/Formulaire.tsx`).
- **Opacité nulle et LCP.** Un élément qui part de `opacity: 0` est ignoré
  par le LCP. Les animations d'entrée partent de 0.4.
- **Polices.** Seule Archivo (titres) est préchargée. Newsreader (textes
  longs) ne l'est pas : précharger les deux faisait passer le LCP mobile de
  2,7 s à 3,9 s.
- **CSP sans `unsafe-eval`** : Zod est en `jitless`, sinon il teste
  `new Function` et la console affiche une violation.
- **`NEXT_PUBLIC_*` est figé au build.** Changer l'URL du flux impose un
  redéploiement ; `RADIO_NOW_PLAYING_URL` et `FORM_WEBHOOK_URL` sont lues à
  l'exécution.
- **`pkill -f "next …"`** dans le conteneur tue aussi le shell qui lance la
  commande (le motif correspond à sa propre ligne). Tuer par PID.
- **Playwright MCP** : même piège que la racine (`chromium-1194` contre
  `chromium-1246`). `playwright-core` + `executablePath:
"/opt/pw-browsers/chromium"` fonctionne.
