# Vesti

Styliste personnel par IA. L'utilisateur photographie sa tenue, reçoit un verdict
argumenté, et chaque pièce détectée (chaussures comprises) vient remplir sa
garde-robe.

Le plan Pro ajoute le **scan de dressing** : jusqu'à 8 photos de penderie, dont
Vesti tire l'inventaire, des tenues composables avec l'existant, et les pièces
qui manquent. Le plan Styliste transforme ces manques en **liste d'achats**
priorisée avec de vraies options trouvées en ligne, et propose chaque jour une
**tenue adaptée à la météo**, composée avec ce que la personne possède déjà.

**Stack** : Next.js 16 (App Router) · TypeScript · Tailwind · Supabase
(Postgres + Auth + Storage) · Stripe · API Claude · déploiement Vercel.

---

## ⚠️ À lire en premier

Le code est écrit et testé, **mais aucune analyse réelle n'a encore été
exécutée** : il n'y avait pas de clé Anthropic pendant le développement. La
qualité des verdicts et la précision du recadrage des vignettes sont les deux
seules choses du projet qui n'ont jamais rencontré une vraie photo. C'est le
point 5 de la checklist, et c'est celui qui compte.

---

## Checklist de mise en route

### 1. Installation locale

```bash
npm install
cp .env.example .env.local
```

Renseigne `.env.local` au fil des étapes suivantes.

---

### 2. Supabase

**a. Créer le projet** sur [supabase.com](https://supabase.com) (région Europe
pour le RGPD, les photos sont des données personnelles).

**b. Appliquer les 8 migrations dans l'ordre**, via le SQL Editor du dashboard
ou le CLI :

```
supabase/migrations/0001_schema.sql            profils, analyses, garde-robe, abonnements
supabase/migrations/0002_rls.sql               Row Level Security + privilèges colonne
supabase/migrations/0003_quota_rpc.sql         quota atomique, remboursement, statut
supabase/migrations/0004_storage_and_wardrobe.sql  bucket privé + fiche produit des pièces
supabase/migrations/0005_referral_and_body.sql     codes de parrainage + poids
supabase/migrations/0006_neutral_referral.sql      vocabulaire neutre, attribution cloisonnée
supabase/migrations/0007_shopping.sql              recommandations d'achat (plan Styliste)
supabase/migrations/0008_weather.sql               position + tenue du jour selon la météo
```

**Première installation, en un seul copier-coller** : `supabase/setup.sql` est
la concaténation des 8 fichiers ci-dessus, dans l'ordre. Colle-le dans le SQL
Editor et exécute — c'est plus court que huit allers-retours, surtout depuis un
téléphone. Les fichiers numérotés restent la référence : toute modification
ultérieure se fait là-bas, dans une nouvelle migration jamais dans `setup.sql`.

Le bucket Storage `outfits` est créé par la migration 0004 — rien à faire à la
main.

**c. Authentication → URL Configuration**

- *Site URL* : `https://ton-domaine.fr` (en local : `http://localhost:3000`)
- *Redirect URLs* : ajoute `https://ton-domaine.fr/auth/callback`
  **et** `http://localhost:3000/auth/callback`

Sans ça, le retour de la connexion Google renvoie une erreur de redirection.

**c bis. 🔴 Authentication → Email Templates : mettre `{{ .Token }}` dans DEUX
modèles**

La connexion par email se fait par un **code à 6 chiffres**, pas par un lien —
voir la section « Pourquoi un code et pas un lien » plus bas, c'est une
conséquence directe de la porte « écran d'accueil ». Supabase envoie le contenu
du modèle : sans le jeton dedans, la personne reçoit un lien et reste bloquée
sur l'écran de saisie du code.

Il faut modifier **les deux modèles**, parce que Supabase n'utilise pas le même
selon les cas :

| Modèle | Utilisé quand |
|---|---|
| **Magic Link** | l'adresse existe déjà (connexion) |
| **Confirm signup** | première connexion avec cette adresse (inscription) |

N'en modifier qu'un revient à casser la moitié des connexions — et la moitié
cassée est celle des *nouveaux* inscrits, celle que tu vois le moins.

Contenu minimal, dans les deux :

```html
<h2>Ton code de connexion Vesti</h2>
<p>Entre ce code dans l'application :</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Il expire dans une heure. Si tu n'as rien demandé, ignore ce message.</p>
```

⚠️ **À tester en vrai avec deux adresses** : une déjà inscrite et une jamais
vue. C'est le seul moyen de vérifier que les deux modèles sont bons.

**d. Authentication → Providers → Google**

1. Google Cloud Console → *APIs & Services* → *Credentials* → *OAuth client ID*
   (type « Web application »).
2. URI de redirection autorisée : celle affichée par Supabase
   (`https://<projet>.supabase.co/auth/v1/callback`).
3. Colle le Client ID et le Client Secret dans Supabase, active le provider.

**e. Variables** (Project Settings → API) :

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # jamais préfixée NEXT_PUBLIC_
```

---

### 3. Stripe

**a. Créer deux produits** avec un prix **récurrent mensuel** chacun :

| Produit  | Prix suggéré | Variable            |
|----------|--------------|---------------------|
| Pro      | 8,99 €/mois  | `STRIPE_PRICE_PRO`      |
| Styliste | 17,99 €/mois | `STRIPE_PRICE_STYLISTE` |

Les montants affichés dans l'app viennent de `lib/plans.ts` — **si tu changes
les prix chez Stripe, mets ce fichier à jour**, rien ne synchronise les deux.

**b. Activer le portail client** : Settings → Billing → Customer portal. Coche
le changement de formule et l'annulation. C'est lui qui gère les upgrades,
downgrades et proratas — l'app ne fait que l'ouvrir.

**c. Webhook** : Developers → Webhooks → endpoint
`https://ton-domaine.fr/api/stripe/webhook`, avec les événements :

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Récupère le *signing secret* → `STRIPE_WEBHOOK_SECRET`.

**d. En local**, pour tester les paiements :

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Cette commande affiche un secret de webhook local, différent de celui de prod.

```
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_PRO=
STRIPE_PRICE_STYLISTE=
```

---

### 4. Claude et météo

Clé API sur [console.anthropic.com](https://console.anthropic.com) →
`ANTHROPIC_API_KEY`.

⚠️ **Deux sortes de clés existent, et une seule marche seule.** Une clé créée
dans la console, rattachée à un espace de travail, se suffit à elle-même. Une
clé **« liée à une identité »** exige que chaque requête précise l'espace dans
lequel elle agit, sinon l'API répond :

```
anthropic-workspace-id is required when authenticating with an
identity-linked API key
```

Côté app, l'erreur ne se voit pas : elle est avalée et affichée comme
« L'analyse n'a pas abouti ». Deux solutions :

- **le plus simple** — recréer une clé depuis la console, dans un espace de
  travail ;
- ou renseigner `ANTHROPIC_WORKSPACE_ID` (visible dans l'URL de la console
  quand tu ouvres l'espace : `.../settings/workspaces/wrkspc_…`). L'en-tête
  n'est envoyé que si cette variable existe.

**Météo : rien à configurer.** La tenue du jour utilise
[Open-Meteo](https://open-meteo.com), sans clé ni compte. ⚠️ Leur offre gratuite
couvre l'usage non commercial ; **au-delà, un abonnement payant est requis** —
à vérifier avant de facturer des clients, ou à remplacer par un autre
fournisseur (tout se change dans `lib/weather.ts`, `fetchWeather`).

Modèle utilisé : `claude-opus-5` (défini une seule fois, dans
`lib/claude/client.ts`).

**Coût à surveiller** : environ 0,02 à 0,04 € par analyse de tenue. La recherche
de produits similaires (plan Styliste) ajoute quelques centimes par pièce. Les
tokens consommés sont enregistrés dans la table `analyses` — de quoi suivre la
marge réelle dès les premiers clients.

---

### 5. 🔴 Valider l'analyse sur de vraies photos

**L'étape la plus importante, et la seule qui ne peut pas être faite sans toi.**

1. Lance l'app, connecte-toi, analyse 5 à 10 tenues réelles (en pied, à plat,
   avec et sans chaussures visibles, bonne et mauvaise lumière).
2. Vérifie **la pertinence du verdict** : trop mou ? trop dur ? passe à côté de
   pièces ? Le prompt se règle dans `lib/claude/prompts.ts`.
3. Vérifie **le cadrage des vignettes** de chaque pièce. Les boîtes renvoyées par
   les modèles de vision sont approximatives : attends-toi à devoir élargir les
   marges. Le prompt demande déjà « une marge confortable », insiste si les
   vignettes rognent les vêtements.
4. Vérifie qu'**aucune marque n'est affirmée à tort**. Une marque ne doit
   apparaître comme un fait que si le logo est réellement lisible.
5. Vérifie que **le corps n'est jamais commenté**, surtout après avoir renseigné
   un poids dans l'onboarding.
6. **Recommandations d'achat** (`/shopping`, plan Styliste) : après un scan,
   vérifie que les liens proposés mènent bien à des pages produit existantes.
   La recherche n'est déclenchée que par un clic et son résultat est stocké —
   si tu la vois repartir à chaque affichage, c'est un bug de coût, pas un
   détail.
7. **Scan de dressing** (`/dressing/scan`, plan Pro) : lance-le sur 3 à 8 photos
   de penderie. Vérifie que chaque pièce est bien découpée dans *sa* photo, que
   les tenues proposées n'utilisent que des vêtements réellement présents, et
   que la même pièce n'est pas listée deux fois quand elle apparaît sur
   plusieurs photos. Un scan de 8 photos coûte sensiblement plus cher qu'une
   analyse de tenue : mesure-le sur tes premiers essais via les colonnes
   `input_tokens` / `output_tokens` de la table `analyses`.
8. **Tenue du jour** (bloc « Aujourd'hui » sur l'accueil, plan Styliste) :
   autorise la géolocalisation, vérifie que la météo affichée correspond bien à
   l'endroit où tu es, et surtout que **la tenue proposée ne contient que des
   vêtements que tu possèdes**. Une suggestion est mise en cache par jour et par
   occasion : si tu la vois se recalculer à chaque rafraîchissement, c'est un
   bug de coût.
9. **Connexion** : teste le code à 6 chiffres avec **deux adresses**, une déjà
   inscrite et une jamais vue — Supabase utilise un modèle d'email différent
   pour chacune (voir l'étape 2 c bis). Vérifie qu'un code arrive bien dans les
   deux cas, et pas un lien. Sur iPhone, fais-le **depuis l'app installée**,
   pas depuis Safari : c'est tout l'intérêt du code.
10. **Suppression de compte** (`/compte`) : à tester une fois sur un compte
   jetable **abonné**, en vérifiant les trois effets dans l'ordre — abonnement
   passé en `canceled` dans Stripe, dossier de l'utilisateur vide dans le bucket
   `outfits`, ligne disparue de `auth.users`. C'est la seule fonctionnalité de
   l'app qu'on ne peut pas rejouer : si elle laisse des photos ou un
   prélèvement derrière elle, tu ne le verras qu'en recevant une réclamation.

---

### 6. Codes de parrainage

Un code par partenaire, à insérer en base quand tu en as besoin :

```sql
insert into referral_codes (code, partner_name, channel)
values ('LEA10', 'Léa Martin', 'tiktok');
```

Le code doit être en majuscules sans espaces ni tirets (la saisie utilisateur est
normalisée automatiquement : `lea-10`, `Lea 10` et `LEA10` fonctionnent tous).

**Lire les résultats** :

```sql
select * from referral_stats order by signups desc;
```

→ inscriptions, clients payants, inscriptions sur 30 jours, dernière inscription,
par code.

Pour arrêter une campagne : `update referral_codes set active = false where code = 'LEA10';`
(les clients déjà attribués le restent).

Côté utilisateur, l'écran ne montre qu'un champ « Code » anodin : rien n'indique
à quoi sert l'attribution, et la validation ne révèle jamais le nom du partenaire.

---

### 7. Back-office

Renseigne les emails autorisés, séparés par des virgules :

```
ADMIN_EMAILS=toi@exemple.fr,associe@exemple.fr
```

Le back-office est ensuite accessible sur `/admin` : inscriptions, MRR,
conversion, coût réel du modèle et attribution par code partenaire.

Deux choses à savoir : **une variable vide n'autorise personne** (le défaut est
fermé), et un visiteur non autorisé reçoit un 404, pas un 403 — il n'apprend
même pas que la section existe. L'autorisation ne repose sur aucun rôle en
base : rien qu'un utilisateur puisse s'attribuer, même en cas de faille de RLS.

---

### 8. Déploiement Vercel

1. Importe le dépôt.
2. Reporte **toutes** les variables de `.env.example` dans les settings du projet.
3. `NEXT_PUBLIC_SITE_URL` = l'URL de production (elle sert à construire les URLs
   de retour Stripe et le callback d'authentification).
4. Une fois le domaine en place, reviens mettre à jour l'URL du webhook Stripe et
   les Redirect URLs Supabase.

---

## ❗ Obligatoire avant d'encaisser le premier euro

Les pages sont écrites, mais elles ne valent rien tant que ces points ne sont
pas traités — **ce sont des obligations légales** pour vendre un abonnement à
des particuliers en France :

- [ ] **Remplir `lib/legal.ts`** : SIRET, adresse, statut, médiateur de la
      consommation, emails. Les trois pages légales (`/mentions-legales`,
      `/cgv`, `/confidentialite`) sont écrites et en ligne, mais elles affichent
      un bandeau rouge listant les champs manquants tant que ce fichier n'est
      pas complété.
- [ ] **Faire relire les CGV et la politique de confidentialité** par un
      juriste. Ce sont des modèles sérieux mais génériques : la responsabilité
      reste la tienne.
- [ ] **Adhérer à un médiateur de la consommation** — obligatoire en France
      pour vendre à des particuliers, et à renseigner dans `lib/legal.ts`.
- [ ] **Bandeau cookies** uniquement si tu ajoutes un pixel TikTok : en l'état, seuls des cookies strictement nécessaires sont posés, aucun consentement n'est requis.
- [x] **Suppression de compte et export des données** (droit RGPD) : la page
      `/compte` permet de télécharger toutes ses données (JSON + liens signés
      vers les photos) et de supprimer son compte. La suppression annule
      l'abonnement Stripe, efface les fichiers du Storage puis l'utilisateur.
- [ ] **Vérifier la région Supabase** : la politique de confidentialité annonce
      un hébergement dans l'Union européenne. Si ton projet est ailleurs,
      corrige `lib/legal.ts` ou change de région.

---

## Ce qui n'est pas implémenté

Pour éviter les mauvaises surprises, voici ce qui était à l'architecture mais
n'existe pas dans le code :

| Fonctionnalité | État |
|---|---|
| Emails transactionnels | **Non fait.** Seuls les emails d'authentification de Supabase partent. |
| Limitation de débit globale | **Non fait.** Le quota d'analyses protège le coût Claude, mais rien ne limite les autres routes. |
| Tests end-to-end | **Non faits**, volontairement. Les tests couvrent la logique métier et le SQL. |

---

## Commandes

```bash
npm run dev     # développement
npm run lint    # ESLint
npm run test    # 93 tests unitaires (Vitest)
npm run build   # build de production
```

Si tu supprimes une page et que le build échoue ensuite sur un
`Cannot find module '../../../app/…/page.js'` : c'est le cache de types de
Next.js qui garde la route disparue. `rm -rf .next` puis rebuild.

### Tests SQL (quota, RLS, parrainage, Storage)

Ils tournent sur un Postgres jetable, sans toucher à Supabase :

```bash
# une fois
sudo -u postgres /usr/lib/postgresql/16/bin/initdb -D /tmp/pgdata-vesti -U postgres --auth=trust
sudo -u postgres /usr/lib/postgresql/16/bin/pg_ctl -D /tmp/pgdata-vesti -l /tmp/pg.log \
     -o '-p 5433 -k /tmp' start

# à chaque fois
sudo -u postgres env PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./supabase/tests/run.sh
```

53 assertions + un test de concurrence qui vérifie que 12 requêtes simultanées
sur un compte gratuit n'autorisent que 3 analyses.

---

## La porte « écran d'accueil »

Rien du tunnel ne s'affiche tant que l'app n'est pas ouverte depuis l'écran
d'accueil. `components/install/install-gate.tsx` intercepte tout, et
`install-guide.tsx` explique comment installer, différemment selon l'appareil.

**Le signal.** Aucune API ne dit « cette personne a installé l'app ». Ce qu'on
détecte, c'est `display-mode: standalone` — « cette page a été lancée depuis
l'icône ». D'où l'absence de bouton « c'est bon, j'ai installé » : il serait
faux. On franchit la porte en revenant par l'icône, ce qui est aussi la seule
preuve honnête.

**L'étape 0, celle qui décide de tout.** Le navigateur intégré de TikTok — d'où
vient ton trafic — **ne sait pas installer d'application**. Ni celui
d'Instagram, de Snapchat ou de Facebook. Une porte sans cette étape bloquerait
100 % de tes visiteurs. La page les fait donc d'abord sortir vers Safari ou
Chrome : sur Android par un bouton (`intent://`, qui ouvre Chrome directement),
sur iOS par les trois points du webview, faute d'équivalent.

**Ce qui reste toujours ouvert** (`OPEN_PATHS` dans `lib/install.ts`) — chacun
casserait quelque chose :

| Chemin | Pourquoi |
|---|---|
| `/auth/callback` | Retour de la connexion Google : il arrive dans le navigateur, jamais depuis l'icône. Le bloquer rendrait Google inutilisable. |
| `/cgv`, `/mentions-legales`, `/confidentialite` | Doivent rester publiques avant tout achat. Les enfermer est un problème juridique. |
| `/admin` | Le back-office se consulte sur un ordinateur. |

**Le service worker (`public/sw.js`) ne met rien en cache, exprès.** Il existe
uniquement parce que Chrome Android n'émet `beforeinstallprompt` — le bouton
« Installer » en un tap — que si un service worker avec un gestionnaire `fetch`
est enregistré. Un cache mal réglé sur une app Next.js sert une coquille périmée
qui référence des bundles disparus : écran blanc chez les gens déjà installés,
et un service worker se désinstalle mal. Si tu ajoutes du cache, fais-le
« réseau d'abord », jamais « cache d'abord » sur les navigations.

### Pourquoi un code et pas un lien

**Sur iOS, une app installée sur l'écran d'accueil a son propre stockage, séparé
de Safari.** Avec un lien de connexion, le tunnel serait cassé de bout en bout :

1. la personne installe Vesti, l'ouvre depuis l'icône, saisit son email ;
2. le lien arrive dans sa boîte mail et s'ouvre **dans Safari** ;
3. la session est créée dans les cookies de Safari ;
4. elle rouvre l'app par l'icône — et elle est toujours déconnectée.

Ce n'est pas un bug : c'est le comportement d'iOS, et c'est irréparable tant que
la connexion sort de l'app. D'où le **code à 6 chiffres**, saisi à l'intérieur :
rien ne quitte le conteneur, le problème disparaît (`lib/otp.ts`,
`app/(auth)/login/login-form.tsx`).

Trois détails qui comptent plus qu'ils n'en ont l'air :

- Le champ porte `autocomplete="one-time-code"`. C'est ce qui fait proposer le
  code au-dessus du clavier par iOS et Android. Sans lui, il faut basculer vers
  la boîte mail et revenir — c'est là qu'on perd les gens.
- Le code n'a **pas de longueur figée** dans le code applicatif. Supabase laisse
  régler « Email OTP Length » et ce projet émet **8 chiffres**, pas 6. Une
  troncature à six jetait silencieusement les deux derniers, envoyait un code
  faux, et Supabase répondait « code expiré » — un message qui fait chercher le
  problème partout sauf au bon endroit. `normalizeOtp` accepte de 6 à 10
  chiffres.
- Le champ n'a **pas** de `maxLength`. Le navigateur l'appliquerait au collage
  *avant* notre nettoyage : « 123 456 » (7 caractères) arriverait tronqué en
  « 123 45 ». C'est `normalizeOtp` qui borne, une fois les espaces retirés — et
  qui accepte donc aussi bien « 123456 » que « Code : 123 456 » collé du mail.
- Le renvoi est bloqué 60 s, la limite de Supabase : mieux vaut un décompte
  visible qu'une erreur venue du serveur.

`/auth/callback` reste en place et reste ouvert dans `lib/install.ts` : la
connexion Google, elle, passe toujours par là et revient dans le navigateur.

---

## Identité visuelle

Toute l'interface découle du logo. Un seul violet, **`#7931FB`**, relevé au
pixel sur le fichier fourni : c'est la couleur d'accent, la couleur des données,
et la teinte dont sont dérivés le papier, l'encre et les bordures. Il n'y a pas
un seul gris neutre dans la palette — chaque valeur est ce violet désaturé ou
éclairci, ce qui fait tenir l'ensemble sans ajouter de seconde couleur.

**Les polices.** Titres en *Bricolage Grotesque* (600–800) : ses graisses lourdes
ont l'épaisseur des traits du logo. Texte courant en *Plus Jakarta Sans*, plus
ouverte et plus lisible à 15 px sur mobile. Les deux sont chargées par
`next/font/google`, donc auto-hébergées au build — aucune requête vers Google au
runtime, rien à déclarer dans une politique de cookies.

**Les trois règles de la palette :**

1. **Un seul aplat violet saturé par écran.** C'est l'action principale. Tout le
   reste — puces, cartes mises en avant, onglet actif — utilise `accent-soft`.
   La seule exception assumée est le bandeau de score de la carte de verdict :
   c'est l'écran de récompense, il a le droit à son aplat.
2. **Chaque couple texte/fond passe 4,5:1.** Les valeurs de `globals.css` ont été
   choisies au calcul, pas à l'œil. Si tu changes une teinte, revérifie le
   couple : `#7931FB` sur blanc donne 5,76:1, il n'y a pas de marge pour
   l'assombrir côté fond ou l'éclaircir côté texte.
3. **Désactivé ≠ transparent.** Un bouton violet à 40 % d'opacité reste un bouton
   violet, et se fait cliquer. L'état désactivé retire la couleur
   (`surface-sunken` + texte `muted`) au lieu de la diluer.

**Les fichiers du logo** sont générés depuis le PNG source : `app/icon.png`
(favicon), `app/apple-icon.png`, `public/logo.png` (écrans), et
`public/logo-maskable.png` — cette dernière est une variante distincte, le
disque réduit à 80 % sur fond violet, sinon Android rogne le logo dans son
masque circulaire. `app/manifest.ts` les déclare pour l'installation sur l'écran
d'accueil, le seul chemin de réengagement gratuit quand le trafic vient de
TikTok.

---

## Repères dans le code

| Besoin | Fichier |
|---|---|
| Changer les prix, quotas, fonctionnalités par plan | `lib/plans.ts` **et** `plan_analysis_limit()` dans `0003_quota_rpc.sql` |
| Régler le ton et les consignes de l'IA | `lib/claude/prompts.ts` |
| Changer de modèle Claude | `lib/claude/client.ts` |
| Garde des routes privées | `proxy.ts` (nommé ainsi car `middleware.ts` est déprécié en Next 16) |
| Couleurs, rayons, ombres, polices | `app/globals.css` (jetons) et `app/layout.tsx` (chargement des polices) |
| Le logo, en icône ou avec le mot | `components/brand/logo.tsx` |
| La porte « écran d'accueil » | `lib/install.ts`, `components/install/` |
| Connexion par code à 6 chiffres | `lib/otp.ts`, `app/(auth)/login/login-form.tsx` |
| Boutons, champs, puces, cartes | `components/ui/button.tsx`, `components/ui/field.tsx` |
| Export et suppression RGPD | `lib/account.ts`, `app/api/account/` |

**Trois règles à ne pas casser :**

1. Le plan et le compteur de quota ne sont **jamais** modifiables par le client
   (privilèges au niveau colonne dans `0002_rls.sql`). Toute écriture passe par
   le service_role ou une fonction `SECURITY DEFINER`.
2. Les liens produits affichés sont filtrés sur les URLs réellement renvoyées par
   la recherche web (`lib/claude/find-products.ts`). Ne jamais afficher une URL
   qui vient seulement du modèle : elle serait plausible et fausse.
3. L'ordre des trois étapes de `app/api/account/delete/route.ts` — Stripe, puis
   Storage, puis `auth.users` — n'est pas arbitraire. Après la suppression de
   l'utilisateur, le `stripe_customer_id` et les chemins des photos ont disparu
   avec le profil : on continuerait à prélever quelqu'un dont le compte n'existe
   plus, et ses photos resteraient en ligne.
