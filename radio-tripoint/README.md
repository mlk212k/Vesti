# Radio Tripoint — site officiel

La radio et le média des Trois Frontières : France · Luxembourg · Allemagne.
Refonte complète de `radio-tripoint-officiel.fr` (auparavant sur Webador),
en application Next.js indépendante, prête à déployer.

**Stack** : Next.js 16.3 (App Router, Turbopack) · React 19 · TypeScript
strict · Tailwind CSS 4 · Zod 4 · lucide-react. Aucune base de données,
aucun traceur, aucun service tiers obligatoire.

---

## Démarrer

```bash
cd radio-tripoint
npm install
cp .env.example .env.local        # tout est facultatif
npm run dev                       # http://localhost:3000
```

Voir les gabarits remplis (articles, épisodes, événements **fictifs**) :

```bash
NEXT_PUBLIC_DEMO_CONTENT=1 npm run dev
```

Vérifications :

```bash
npm run typecheck && npm run lint && npm run build
```

## Mise en ligne : ce qu'il reste à fournir

Le site fonctionne dès maintenant, mais il n'invente rien : chaque
information manquante s'affiche proprement comme « à venir ». Pour le
compléter, dans l'ordre d'impact :

| #   | À fournir                                                      | Où                                                | Effet                                                                                  |
| --- | -------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 1   | **URL du flux audio** (Radioking → Diffusion → Liens d'écoute) | `NEXT_PUBLIC_STREAM_URL`                          | Active le direct dans tout le site. Sans elle, le bouton affiche « flux non branché ». |
| 2   | Lien du player Radioking                                       | `NEXT_PUBLIC_RADIOKING_URL`                       | Bouton « Ouvrir le player »                                                            |
| 3   | Grille des émissions (jour, début, fin)                        | `data/shows.ts → creneaux`                        | Active « En ce moment », « Ensuite », « Quand écouter ? »                              |
| 4   | Présentations et visuels des émissions                         | `data/shows.ts`                                   | Pages émission complètes                                                               |
| 5   | Adresses des réseaux sociaux                                   | `config/socialLinks.ts`                           | Icônes dans le pied de page, le menu, la page Contact                                  |
| 6   | Webhook des formulaires (Make, n8n, Zapier, Formspree…)        | `FORM_WEBHOOK_URL`                                | Envoi en ligne. Sans lui : repli « envoyer par e-mail » pré-rempli                     |
| 7   | Endpoint « titre en cours »                                    | `RADIO_NOW_PLAYING_URL`                           | Artiste — titre dans le lecteur                                                        |
| 8   | Forme juridique, SIRET, directeur·rice de publication          | `config/site.ts → legal`                          | Mentions légales complètes                                                             |
| 9   | Photo de la région / du studio                                 | `public/media/` + `config/site.ts → visuels.hero` | Image de fond du hero                                                                  |
| 10  | Articles, replays, événements existants                        | `data/*.ts` ou un CMS                             | Voir `MIGRATION.md`                                                                    |

Les variables `NEXT_PUBLIC_*` sont figées au build : les modifier impose
un redéploiement.

**Logo et couleurs** : le logo officiel est en place
(`public/brand/logo-radio-tripoint.png`, découpé en rond depuis le fichier
fourni) et le site reprend exactement ses couleurs — jaune `#F9B800`, noir,
blanc. Favicon et icônes d'application sont générés à partir de lui. Une
version vectorielle (SVG) du logo, si elle existe, donnerait un rendu plus
net : la déposer dans `public/brand/` et mettre son chemin dans
`config/site.ts → visuels.logo`.

## Architecture

```
app/                    routes (App Router)
  page.tsx              accueil
  actualites/           flux général + [slug] (article, image OG générée)
  art-culture/ …        rubriques (gabarit commun CategoryPage)
  emissions/[slug]      émissions
  podcasts/[slug]       replays
  agenda/[slug]/ics     événements + export calendrier
  publicite/ a-propos/ contact/ soumettre-une-information/
  recherche/            recherche globale (?q=)
  api/en-direct         relais « titre en cours » (sans CORS)
  api/recherche         résultats instantanés
  api/formulaires/[type]  réception des formulaires
  sitemap.ts robots.ts manifest.ts opengraph-image.tsx
config/                 site, radioConfig, socialLinks, navigation, analytics
data/                   contenu (+ data/demo : fictif)
types/                  article, show, podcast, event, category, media
lib/contenu/            SEUL point de lecture du contenu → remplaçable par un CMS
lib/radio/              moteur audio, grille, horloge
lib/seo/                metadata, JSON-LD
lib/formulaires/        schémas Zod (partagés client/serveur), limiteur
components/             layout, radio, news, shows, podcasts, events,
                        territoire, forms, rgpd, ui, marque
```

### Le lecteur

Un seul moteur audio (`lib/radio/moteur.ts`) pour le direct **et** les
podcasts, hors de React (`useSyncExternalStore`) : il survit aux
navigations, gère les états `idle / loading / playing / paused / error`,
coupe réellement le flux en pause (pas de retard à la reprise), mémorise le
volume, alimente les commandes système (Media Session) et ne peut pas faire
planter une page. La barre de lecture est présente en bas de chaque page.

### Brancher un CMS

Les pages ne lisent jamais `data/` directement : elles passent par
`lib/contenu/*.ts`, dont les fonctions sont asynchrones. Pour passer à un
CMS headless (Sanity, Strapi, WordPress, Supabase…), réécrire ces
fonctions pour qu'elles renvoient les mêmes types (`types/*.ts`). Le corps
des articles est un tableau de blocs (`types/media.ts → Bloc`), portable
vers n'importe quel éditeur riche.

### Formulaires et sécurité

Validation Zod identique côté client et serveur · nettoyage des entrées ·
champ piège + délai minimal anti-robot (un robot reçoit un faux succès) ·
limite de 5 envois / 10 min / IP (IP hachée) · pièces jointes filtrées
(JPG, PNG, WebP, PDF, 5 Mo) · aucune donnée personnelle dans les journaux ·
CSP, HSTS, `nosniff`, `frame-ancestors 'none'`.

La limite de débit est en mémoire : suffisante sur une instance ; sur un
hébergement multi-instances, la brancher sur Upstash / Vercel KV
(`lib/formulaires/limiteur.ts`).

### RGPD

Aucun cookie ni traceur. Le stockage local ne sert qu'au thème et au
volume. L'architecture de consentement est prête : renseigner un outil
dans `config/analytics.ts` fait apparaître le bandeau, et le script n'est
chargé qu'après accord.

## Qualité mesurée

Mesures sur le build de production dans l'état de livraison (sans
contenu de démo, sans flux configuré), Lighthouse 12, profil mobile
(4G simulée) :

| Page                      | Perf.   | Access. | Bonnes pratiques | SEO |
| ------------------------- | ------- | ------- | ---------------- | --- |
| Accueil                   | 88 – 93 | 100     | 100              | 100 |
| Actualités                | 96      | 100     | 100              | 100 |
| Émission                  | 94      | 100     | 100              | 100 |
| Podcasts                  | 97      | 100     | 100              | 100 |
| Agenda                    | 97      | 100     | 100              | 100 |
| Publicité                 | 93      | 100     | 100              | 100 |
| Contact                   | 94      | 100     | 100              | 100 |
| Soumettre une information | 90      | 100     | 100              | 100 |

L'accueil varie selon le passage : son élément LCP est le grand titre, et
le délai restant tient au chargement de la police de titrage (90 Ko, seule
préchargée). Passer en `font-display: optional` gagnerait quelques points
au prix d'une police système au premier passage : non retenu.

CLS ≤ 0,02 partout. Recette automatisée sur 24 routes × 9 largeurs (320 à
1920 px) : aucun débordement horizontal, aucune erreur console, un seul
`h1` par page.
