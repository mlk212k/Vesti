# Club App

App web pour gérer un club de sport : membres, calendrier (matchs / entraînements
avec RSVP), annonces, chat temps réel.

Stack : **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4** +
**Supabase** (auth, Postgres, realtime).

Ce projet est autonome — pas de dépendance vers le reste du repo.

## Démarrage

### 1. Créer un projet Supabase

1. Aller sur https://supabase.com et créer un projet.
2. Récupérer dans **Project settings → API** :
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Dans **SQL Editor**, exécuter le contenu de
   [`supabase/migrations/0001_schema.sql`](./supabase/migrations/0001_schema.sql).
   Ça crée les tables, active la RLS, et ajoute le trigger qui crée
   automatiquement un profil quand un utilisateur s'inscrit.

### 2. Copier les variables d'env

```bash
cp .env.example .env.local
# Puis remplir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et
# NEXT_PUBLIC_CLUB_NAME.
```

### 3. Installer et lancer

```bash
cd club-app
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

### 4. Se donner le rôle admin

Le premier compte créé est `member` par défaut. Pour se promouvoir admin,
exécuter dans le SQL Editor Supabase :

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'ton.email@example.com');
```

Ensuite, l'admin peut promouvoir d'autres membres depuis la page **Membres**.

## Structure

```
club-app/
├── app/
│   ├── page.tsx                 # Landing publique
│   ├── login/                   # Connexion + inscription
│   ├── auth/callback/           # Handler OAuth / magic link
│   ├── logout/                  # POST -> signOut
│   └── (app)/                   # Groupe protégé par le proxy
│       ├── layout.tsx           # requireUser() + Nav
│       ├── dashboard/           # Accueil
│       ├── members/             # Annuaire + gestion des rôles (admin)
│       ├── events/              # Calendrier + création + RSVP
│       ├── announcements/       # Annonces publiées par admin/coach
│       ├── chat/                # Chat temps réel via Supabase Realtime
│       └── profile/             # Édition de son propre profil
├── components/nav.tsx
├── lib/
│   ├── auth.ts                  # getSessionUser / requireUser / requireRole
│   ├── format.ts                # Formatage FR
│   └── supabase/
│       ├── client.ts            # Client browser
│       ├── server.ts            # Client server (RSC / actions)
│       └── proxy.ts             # Refresh session dans le proxy
├── proxy.ts                     # Nx16 : middleware renommé proxy, Node runtime
└── supabase/migrations/         # Schéma + RLS + trigger + realtime
```

## Rôles

| Rôle    | Peut lire | Peut publier annonce / créer événement | Peut gérer membres |
| ------- | :-------: | :------------------------------------: | :----------------: |
| member  |    ✅     |                   —                    |         —          |
| coach   |    ✅     |                   ✅                   |         —          |
| admin   |    ✅     |                   ✅                   |         ✅         |

Chaque membre peut RSVP aux événements et écrire dans le chat.

## Sécurité

- La RLS Supabase est activée sur toutes les tables. Aucune requête client ne
  peut sortir de son périmètre, même si on triche depuis la console.
- Chaque Server Action commence par `requireUser()` ou `requireRole(...)`.
- Le mot de passe minimal est 6 caractères — à remonter côté Supabase Auth
  settings selon les besoins.

## Points à savoir (Next.js 16)

- `cookies()`, `headers()`, `params`, `searchParams` sont async — toujours
  `await`.
- Le fichier `proxy.ts` remplace `middleware.ts` (runtime Node uniquement).
- Turbopack est le bundler par défaut.
- Pas de commande `next lint` : `npm run lint` invoque `eslint` directement.
