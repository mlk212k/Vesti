# Application commerciale — cartes NFC

Pilotage d'une équipe de terrain qui vend des cartes NFC aux commerces
(avis Google) : stock de cartes, journées de travail, ventes, commissions,
chat et audit.

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
`supabase/migrations/` **dans l'ordre**, de `0001` à `0008`. Ou, avec la CLI
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

**Direction artistique : le ticket de caisse.** L'objet central de cette
app, c'est un reçu — ce que tu as vendu, ce que le chef prend, ce qui te
reste. Le reste de l'interface en découle : panneaux aux bords crantés
(`.ticket`), lignes à pointillés de conduite entre un libellé et un montant
(`.ligne-ticket`), tampons encreurs inclinés pour les statuts (`.tampon`),
code-barres généré à partir de l'identifiant de la journée, bandeau
défilant façon caisse enregistreuse.

Couleurs : noir profond et ardoise, blanc cassé, **vert lime** pour l'argent
gagné et l'action principale, **orange** pour l'alerte et le dépassement,
**cyan NFC** pour tout ce qui touche à la carte, rouge réservé au danger. La
matière vient d'une trame de points en demi-teinte, d'un grain très léger et
d'un halo unique en haut de page — pas d'ombres portées molles : les boutons
portent une ombre dure de 4 px, franche.

Typographie : Bebas Neue en capitales serrées pour les titres, JetBrains
Mono pour les sur-titres, les statuts et tous les chiffres, Inter pour le
texte courant. Les chiffres sont tabulaires : une colonne de montants ne
danse pas quand une valeur change.

**Sons.** Six effets courts, synthétisés à la volée en Web Audio
(`lib/sfx.ts`) — aucun fichier audio n'est livré : le tiroir-caisse à
l'enregistrement d'une vente, le tampon à l'ouverture et à la clôture de la
journée, un cran au compteur de quantité, un pop à l'envoi d'un message, un
blip à la réception, deux notes descendantes en cas de refus. Rien ne dépasse
120 ms, et chacun part sur le **résultat** de l'action, jamais sur le clic.
Le réglage se coupe depuis le profil et se retient d'une visite à l'autre.

Sur mobile : cinq onglets en bas (accueil, ventes, commerces, chat, profil
pour un commercial ; équipe et planning à la place pour l'encadrement),
zones tactiles larges, et une vente s'enregistre en trois gestes. Les icônes
et les graphiques sont dessinés à la main en SVG — aucune librairie
d'icônes ni de charts.

L'app est installable sur l'écran d'accueil (manifeste + icônes générées par
`scripts/generate-icons.py`). En PWA, le rebond vertical et le glissement
latéral sont neutralisés (`overscroll-behavior`, `touch-action`), et le
service worker ne met **jamais** une page en cache — seulement les assets :
un écran de chiffres périmés serait pire qu'un écran vide.

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
