# Migration depuis Webador

## Audit du site actuel — conditions et limites

L'audit de `www.radio-tripoint-officiel.fr` n'a **pas** pu se faire en
lisant les pages : le réseau de l'environnement de construction bloquait
le domaine (ainsi que l'Internet Archive et Radioking). Ce qui a servi de
source :

- le brief (structure des pages, émissions, coordonnées) ;
- les extraits indexés par les moteurs de recherche.

Faits établis et repris dans le site :

| Fait                                                                                                                                                                               | Source        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| Titre : « Radio Tripoint - Actualités des Trois Frontières »                                                                                                                       | index         |
| Média transfrontalier France / Luxembourg / Allemagne : actualités locales, sport, culture, émissions                                                                              | index         |
| Basée à Sierck-les-Bains ; « nouvelle radio locale du Sierckois »                                                                                                                  | index         |
| Activités : exploitation radio, vente d'espaces publicitaires, promotion de sites internet, création de campagnes publicitaires et marketing                                       | index         |
| « Radio transfrontalière qui connecte les régions et les esprits » ; engagement de qualité et de service                                                                           | index         |
| Présence sur Facebook, Instagram et Telegram (adresses non récupérées)                                                                                                             | index         |
| Hôtel de ville, 12 Quai des Ducs de Lorraine, 57480 Sierck-les-Bains · 06 58 22 17 48 · info@radio-tripoint-officiel.fr                                                            | brief + index |
| Émissions : Génération Z (« le rendez-vous des 15-17 ans »), On Vous Donne la Parole, Bien-être & Thérapies Alternatives, Histoire & Mémoire Régionale, Talents du coin !, Olé Olé | brief         |

**Non récupéré, donc non inventé** : logo et couleurs, photos, textes
complets des pages, articles, fichiers des podcasts, événements, horaires
et animateurs des émissions, URL du flux, URL des réseaux sociaux.

### Constats sur l'ancien site (d'après sa structure)

- Plateforme Webador : gabarit générique, peu de contrôle sur le HTML, les
  performances et les données structurées.
- Rubriques nombreuses au même niveau (13 entrées) : hiérarchie de
  navigation plate ; le direct n'est pas l'action principale.
- URL hétérogènes (`/preventions-sensibilisation`, `/podcast-replay`,
  `/a-propos-de-nous`).
- Pas de pages individuelles par émission, épisode ou événement : rien à
  indexer ni à partager finement.

## Correspondance des URL

Redirections permanentes déclarées dans `next.config.ts` :

| Ancienne URL                   | Nouvelle URL  |
| ------------------------------ | ------------- |
| `/nos-emissions`               | `/emissions`  |
| `/podcast-replay`              | `/podcasts`   |
| `/a-propos-de-nous`            | `/a-propos`   |
| `/preventions-sensibilisation` | `/prevention` |
| `/accueil`, `/index.html`      | `/`           |

Conservées à l'identique (aucune redirection nécessaire) : `/actualites`,
`/contact`, `/publicite`, `/agenda`, `/art-culture`, `/actu-music`,
`/actu-people`, `/mode-style`, `/sport`.

**À faire avant la bascule DNS** : exporter la liste complète des URL
indexées (Google Search Console → Pages, ou `site:radio-tripoint-officiel.fr`)
et ajouter une ligne au tableau `redirections` de `next.config.ts` pour
chaque ancienne page d'article qui a une équivalente.

## Reprendre le contenu

1. **Articles** → `data/articles.ts` (type `Article`) : titre, chapeau,
   rubrique, date de publication, corps en blocs, visuel dans
   `public/media/`. Les slugs doivent être stables : ils font l'URL.
2. **Émissions** → compléter `data/shows.ts` : `presentation`, `creneaux`,
   `animateurs`, `visuel`, `reseaux`.
3. **Podcasts** → `data/podcasts.ts` : URL des fichiers audio (Radioking,
   Ausha, Podcloud… ou `public/`), durée en secondes, émission d'origine.
4. **Événements** → `data/events.ts`, avec date ISO et fuseau
   (`2026-10-12T20:00:00+02:00`).
5. **Visuels** → `public/brand/` (logo) et `public/media/` (photos) ; les
   déclarer dans `config/site.ts`.

Au-delà de quelques dizaines d'articles, brancher un CMS derrière
`lib/contenu/` plutôt que d'éditer des fichiers (voir le README).

## Bascule

1. Déployer sur Vercel (`vercel.json` fourni, région Paris) avec les
   variables de `.env.example`.
2. Vérifier la préproduction : direct, formulaires, redirections.
3. Pointer le domaine `radio-tripoint-officiel.fr` vers Vercel.
4. Soumettre `https://www.radio-tripoint-officiel.fr/sitemap.xml` dans
   Google Search Console et surveiller les erreurs 404 les premières
   semaines.
