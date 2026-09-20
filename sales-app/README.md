# Application commerciale — cartes NFC

Pilotage d'une équipe de terrain qui vend des cartes NFC aux commerces
(avis Google) : stock de cartes, journées de travail, ventes, commissions,
chat et audit.

Les nouveautés de chaque mise à jour, écrites pour l'équipe et non pour les
développeurs, sont dans [`CHANGELOG.md`](./CHANGELOG.md).

Application **autonome**, dans son propre dossier, avec son `package.json`,
son projet Supabase et son déploiement. Elle n'importe rien du projet Vesti
parent.

---

## Les règles, en une page

| Règle | Où elle vit |
|---|---|
| CA = quantité × prix unitaire | colonne générée `sales.amount_cents` |
| Commission = CA × taux | colonne générée `sales.commission_cents` |
| Net = CA − commission | colonne générée `sales.net_cents` |
| Taux de commission | `app_settings.commission_rate_bp` (10 % = `1000`) |
| Objectif quotidien | `app_settings.default_daily_goal`, surchargeable par personne |
| Prix par défaut | `app_settings.default_card_price_cents` |
| Retenue si objectif manqué | **jamais automatique** — proposée à la validation, saisie par un humain |

Aucun de ces nombres n'est écrit en dur dans le code. Le front n'envoie
jamais un montant : il envoie une quantité et un prix, Postgres calcule.

L'argent est stocké en **centimes** (entiers) et le taux en **points de
base** (entiers) : pas un seul flottant sur le chemin de l'argent.

Le taux est **figé à la vente**. Passer de 10 % à 12 % demain ne réécrit pas
les ventes d'hier.

---

## Rôles

| | Admin (chef) | Manager (Malik) | Commercial |
|---|---|---|---|
| Voir ses propres données | ✓ | ✓ | ✓ |
| Voir toute l'équipe | ✓ | ✓ | — |
| Attribuer des cartes | ✓ | ✓ | — |
| Réapprovisionner / corriger le stock | ✓ | — | — |
| Valider une journée, appliquer une retenue | ✓ | ✓ | — |
| Créer des comptes, changer les rôles | ✓ | — | — |
| Paramètres, journal d'audit | ✓ | — | — |
| Annuler une vente | ✓ | — | — |

Les permissions sont appliquées **trois fois**, volontairement :

1. `proxy.ts` — redirige vers `/login` sans session (confort, pas sécurité) ;
2. `requireRole()` dans chaque page — renvoie un écran propre ;
3. **la base** — RLS sur chaque table + vérification du rôle dans chaque
   fonction SQL.

Seule la troisième compte vraiment. Changer un identifiant dans une URL, ou
rejouer une requête REST à la main avec la clé publique, ne donne rien :
`supabase/tests/01_regles.sql` le vérifie explicitement.

---

## Architecture

```
app/
  (auth)/           login, mot de passe oublié, nouveau mot de passe
  (app)/            l'application connectée
    page.tsx        tableau de bord (3 lectures selon le rôle)
    ventes/         liste, création, fiche + correction
    commerces/      liste, création, fiche
    cartes/         stock personnel du commercial
    stock/          dépôt, attributions, mouvements (encadrement)
    equipe/         supervision + profil détaillé d'un membre
    historique/     journées passées
    analytics/      filtres de période + graphiques
    chat/           conversation d'équipe et messages privés
    planning/       disponibilités de la semaine, relances (encadrement)
    profil/         nom, téléphone, photo, créneaux, sons
    membres/        comptes et rôles (admin)
    parametres/     taux, objectif, prix, retenue (admin)
    audit/          journal (admin)
lib/                auth, requêtes, formats, argent, périodes
components/         briques d'interface partagées
supabase/
  migrations/       le schéma, source de vérité
  tests/            tests des règles métier et de la RLS
scripts/            seed de démo, génération des icônes, lanceur de tests
```

### Écritures

Deux régimes, choisis selon l'enjeu :

- **Fonctions SQL `security definer`** pour tout ce qui touche à l'argent et
  au stock (ventes, journées, attributions, commissions). Ces tables n'ont
  **aucune policy d'INSERT/UPDATE** : l'écriture directe est impossible,
  même avec un jeton valide. La fonction pose un verrou, vérifie
  l'invariant (« on ne vend pas des cartes qu'on n'a pas »), écrit la ligne,
  le mouvement de stock et l'audit — le tout dans une seule transaction.
- **Écriture directe sous RLS** pour les fiches commerce, les messages et
  les notifications, qui n'engagent ni l'un ni l'autre.

### Stock

Un grand livre en ajout seul (`card_movements`). Chaque ligne porte deux
deltas signés : l'effet sur le dépôt et l'effet sur les cartes en main d'une
personne. Les totaux ne sont jamais des compteurs qu'on incrémente — ce sont
des sommes, donc toujours d'accord avec l'historique.

Invariant vérifié par les tests :
`dépôt + en main + vendues + perdues = achats + recomptages`.

---

## Installation

```bash
npm install
cp .env.example .env.local     # puis renseigner le projet Supabase
```

### Base de données

Dans le SQL Editor de Supabase, appliquer les fichiers de
`supabase/migrations/` **dans l'ordre**, de `0001` à `0009`. Ou, avec la CLI
Supabase :

```bash
supabase link --project-ref <ref>
supabase db push
```

### Données de démonstration

```bash
npm run seed
```

Crée 1 admin, 1 manager et 5 commerciaux, du stock, des commerces, des
journées, des ventes et des messages — de quoi voir tous les écrans remplis.
Le seed se connecte réellement avec chaque compte et passe par les mêmes
fonctions que l'application : s'il produit quelque chose, c'est que l'app
aurait pu le produire aussi.

Mots de passe affichés en fin d'exécution. **À changer avant tout usage
réel.**

### Lancer

```bash
npm run dev
```

---

## Vérifications

```bash
npm run typecheck        # TypeScript
npm run lint             # ESLint (règles React + Next 16)
npm run build            # build de production
./scripts/test-db.sh     # règles métier + RLS sur un Postgres local
```

`test-db.sh` recrée une base vierge, y rejoue les sept migrations, puis
exécute une cinquantaine d'assertions en se faisant passer tour à tour pour
le chef, le manager et deux commerciaux — avec le rôle `authenticated` et une
revendication JWT, exactement comme PostgREST en production. Tester en
superutilisateur ne testerait rien : la RLS ne s'y applique pas.

Il lui faut un Postgres accessible (`PGHOST`, `PGPORT`, `PGUSER`) et il
n'écrit que dans sa propre base `sales_app_test`. Les objets que Supabase
fournit d'office (`auth.users`, `auth.uid()`, `storage`, les rôles) sont
simulés par `supabase/tests/00_stub_supabase.sql`, qui n'est jamais appliqué
au vrai projet.

---

## Déploiement

Projet Vercel `arena-cartes`, **racine `sales-app`** (le dépôt contient
plusieurs applications — sans ce réglage, Vercel construit la mauvaise).

Les quatre variables `NEXT_PUBLIC_*` sont lues au moment du BUILD, pas à
l'exécution : après les avoir changées, il faut relancer un déploiement,
sinon l'ancienne valeur reste figée dans le bundle.

`SUPABASE_SERVICE_ROLE_KEY`, elle, est lue à l'exécution. Tant qu'elle
n'est pas renseignée, l'app tourne normalement mais deux choses restent
inertes, par conception plutôt que par accident :

- la création de comptes et la réinitialisation de mot de passe depuis la
  page Membres (l'API d'auth refuse de créer quelqu'un d'autre avec une clé
  publique) ;
- le comptage des tentatives de connexion ratées, qui laisse alors passer
  plutôt que de bloquer tout le monde. Supabase applique de toute façon ses
  propres quotas.

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé publique (inlinée dans le navigateur, c'est normal) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur uniquement** — création de comptes, rôles, limitation des connexions |
| `NEXT_PUBLIC_SITE_URL` | base des liens envoyés par email |
| `NEXT_PUBLIC_APP_NAME` | nom affiché (défaut : `ARENA`) |

La clé `service_role` ignore la RLS. Elle n'est utilisée que dans
`lib/supabase/admin.ts`, marqué `server-only` : un import accidentel depuis
un composant client casse le build au lieu d'expédier la clé au navigateur.

---

## Sécurité

- Mots de passe hachés par Supabase Auth (jamais stockés par l'app).
- Sessions en cookies httpOnly, rafraîchies par `proxy.ts`.
- Connexion limitée : 5 échecs par IP sur 15 min, 10 par email sur 10 min
  (migration `0005`). Les compteurs sont inaccessibles aux clés publiques.
- Message de connexion identique pour « email inconnu » et « mauvais mot de
  passe » — sinon la page devient un testeur d'adresses.
- Photos dans un bucket **privé**, servies par URL signée d'une heure. Le
  chemin d'un objet commence par l'identifiant de son propriétaire, ce que la
  policy de stockage exige.
- Aucun compte n'est supprimable depuis l'interface : on désactive. Supprimer
  un commercial emporterait ses ventes, donc la comptabilité du mois.
- Journal d'audit en écriture seule, lisible par l'admin : connexions,
  journées, ventes et corrections, attributions, comptes, paramètres.

---

## Interface

**Direction artistique : la matière.** Règle unique, dont tout le reste
découle :

> On ne décore pas l'interface. On lui fait adopter le comportement d'un
> objet.

L'écran d'accueil du commercial n'est pas un tableau de bord : c'est une
**carte NFC en volume**, posée dans le noir. Ce n'est pas une métaphore
décorative — c'est ce que l'équipe vend, et son état EST l'état de la
journée. La tranche qui se charge, c'est 8 cartes sur 10 ; il n'y a pas de
jauge à côté, la jauge est l'objet. Il n'y a pas non plus de bouton
« commencer ma journée » : un appui long sur la carte l'ouvre, un autre
enregistre une vente.

La carte réagit physiquement. Le reflet suit le doigt, la matière s'enfonce
sous la pression, elle tourne en 3D quand on la fait glisser, continue sur
son inertie quand on la lâche et revient avec un léger dépassement. Au
repos elle respire : ±0,4 % sur sept secondes, qu'on ne remarque pas
consciemment mais dont l'absence donne un écran mort.

**Quatre partis pris, et ce qu'ils interdisent :**

1. **Monochrome, un seul accent.** Cinq gris et un blanc cassé. Une seule
   couleur — la braise `#ff4a1c` — et trois usages autorisés : la tranche
   qui se charge, le chiffre qui appartient à la personne qui regarde, et ce
   qui réclame une action maintenant. Pas de vert de succès, pas de rouge de
   danger : une erreur se signale par la matière (un creux, une arête qui
   s'allume), pas par une teinte de plus.
2. **Pas de cartes, pas de bordures.** Ce qui sépare deux informations,
   c'est du vide, un écart de taille de texte ou un changement de
   profondeur. Environ 80 % de l'écran ne porte rien.
3. **Formes organiques.** Rayons larges, arêtes de lumière plutôt que
   contours, rien de parfaitement géométrique.
4. **Une caméra, pas des pages.** Les apparitions sont des mises au point
   (l'élément arrive flou et en arrière, la netteté se fait), les ouvertures
   des reculs de caméra. Aucun slide, aucun fondu sec.

**Typographie.** Deux voix, et c'est l'écart entre elles qui fait
l'identité : **Archivo** poussée à `wdth 125 / wght 900` — large, massive,
énergie de signalétique urbaine — réservée aux très grands mots, dont un
seul par écran ; et **JetBrains Mono** en très petit et très espacé pour
tout ce qui est libellé, heure ou identifiant. **Inter Tight** porte le
texte courant. Un mot-matière géant passe derrière l'objet, déborde de
l'écran et ne se lit pas vraiment : il donne l'échelle.

**Navigation.** Cinq positions, pas cinq pages. En bas, un rail : un trait
par position, celui de la position courante s'allonge et prend l'accent, et
son nom — un seul — s'affiche au-dessus. Pas de libellé répété cinq fois,
pas d'icône dans une boîte.

**Sons.** Six effets courts, synthétisés à la volée en Web Audio
(`lib/sfx.ts`) — aucun fichier audio n'est livré : le tiroir-caisse à
l'enregistrement d'une vente, le tampon à l'ouverture et à la clôture de la
journée, un cran au compteur de quantité, un pop à l'envoi d'un message, un
blip à la réception, deux notes descendantes en cas de refus. Rien ne
dépasse 120 ms, et chacun part sur le **résultat** de l'action, jamais sur
le clic. Le réglage se coupe depuis le profil.

**Accessibilité.** Toute la DA repose sur le mouvement : `prefers-reduced-motion`
le supprime entièrement et tout retombe sur de simples variations
d'opacité. L'appui long est doublé d'un équivalent clavier, et le
mot-matière est toujours `aria-hidden` — ce qu'il dit est écrit ailleurs,
en lisible.

L'app est installable sur l'écran d'accueil (manifeste + icônes générées par
`scripts/generate-icons.py`). En PWA, le rebond vertical et le glissement
latéral sont neutralisés (`overscroll-behavior`, `touch-action`), et le
service worker ne met **jamais** une page en cache — seulement les assets :
un écran de chiffres périmés serait pire qu'un écran vide.

---

---

## Notifications push

Le chemin complet, pour qu'il n'y ait pas de magie :

1. le téléphone s'abonne depuis **Profil → Notifications** ; l'abonnement
   est rangé dans `push_subscriptions`, visible seulement par son
   propriétaire ;
2. quelque chose crée une ligne dans `notifications` (message, relance,
   validation de journée…) ;
3. le trigger `notifications_push` appelle, **sans bloquer** (pg_net), la
   fonction Edge `push` ;
4. celle-ci signe et chiffre le message avec les clés VAPID et le remet au
   service de push du navigateur.

L'envoi est branché sur la **table**, pas sur l'application : les
notifications sont créées par des fonctions SQL qui savent, elles, qui est
destinataire. Une notification créée par une fonction écrite demain partira
sans qu'on ait rien à rebrancher.

Les secrets (clé privée VAPID, secret partagé entre le trigger et la
fonction, URL) vivent dans le **Vault Supabase**, chiffrés, lisibles
uniquement par le rôle de service. Seule la clé **publique** est côté
navigateur, dans `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — c'est son rôle.

Tant que ces secrets ne sont pas renseignés, l'app fonctionne exactement
pareil : la notification existe en base, elle ne part simplement pas en
push. Une notification ne doit jamais échouer parce qu'un envoi extérieur
est mal configuré.

Le contenu poussé se limite au titre, au texte et au lien. **Jamais un
montant** : une notification s'affiche sur un écran verrouillé, parfois
devant quelqu'un d'autre.

Sur iPhone, l'API n'existe que si l'app a été **ajoutée à l'écran
d'accueil** ; depuis Safari, le bouton l'explique au lieu de ne rien faire.

---

## Planning et relances

Chacun déclare ses créneaux — sept jours × matin/après-midi — depuis son
profil ; l'encadrement voit la grille complète de la semaine sur
`/planning`. La vue `v_planning_du_jour` croise ces créneaux avec les
journées ouvertes et répond à la seule question qui compte le matin : **qui
est attendu aujourd'hui, et qui n'a pas encore ouvert sa journée ?**

De là, Malik ou le chef envoie une **relance** : un message nominatif qui
arrive en notification. La fonction `send_nudge` refuse une seconde relance
de la même personne avant une heure (`NUDGE_TOO_SOON`) — la limite est dans
la base, pas dans un bouton grisé.

Une absence un jour non déclaré n'est pas un retard : c'est précisément ce
que le planning permet de distinguer, et rien dans l'app ne transforme un
créneau manqué en retenue d'argent.

---

## Chat

Un fil d'équipe et des fils privés. Les messages arrivent en temps réel
(Realtime), les présences aussi : un point indique qui a le fil ouvert. On
voit **qui est dans la conversation** (panneau des participants, replié par
défaut), les messages consécutifs d'une même personne sont regroupés, les
journées sont séparées par une étiquette, et on réagit en un geste avec une
palette courte de six emojis. Les réactions sont cloisonnées comme le reste :
on ne peut réagir qu'à un message d'une conversation dont on est membre.

---

## Profil

Chacun modifie son nom, son téléphone, sa photo (bucket public `avatars`,
2 Mo) et ses disponibilités, et coupe les sons s'il le souhaite. Le rôle,
l'objectif quotidien et l'état actif restent la main de l'admin : un
commercial ne s'attribue pas son propre objectif.
