<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Agent notes for `club-app`

This is a fresh Next.js 16 App Router project. It is a **separate app** from
the parent `Vesti` project — its own `package.json`, its own `node_modules`,
its own env. Do not import from `../` outside this folder.

Before writing code, read the relevant guide under
`node_modules/next/dist/docs/` (from this file's directory). Next.js 16 has
breaking changes vs training data — the important ones:

- `cookies()`, `headers()`, `params`, `searchParams` are **async**. `await`
  them everywhere.
- The `middleware.ts` convention is renamed to `proxy.ts` (function name
  `proxy`), Node runtime only.
- Turbopack is the default bundler — no `--turbopack` flag needed.
- `next lint` is removed. Run `npm run lint` (which calls `eslint` directly).
- `serverRuntimeConfig` / `publicRuntimeConfig` are removed — use env vars.
- `revalidateTag` now takes a second `cacheLife` argument; prefer
  `updateTag` from Server Actions when you want read-your-writes.

## Auth

Supabase auth via `@supabase/ssr`. Server-side clients are created per
request via `lib/supabase/server.ts`; the `proxy.ts` at the app root refreshes
session cookies on every navigation. All Server Actions must verify
`auth.getUser()` before mutating.

## Data

Schema lives in `supabase/migrations/`. Row-level security is on for every
table; policies gate reads/writes by role (admin / coach / member). See
`0001_schema.sql` for the source of truth.

## Realtime chat

`app/(app)/chat/chat-panel.tsx` is a Client Component that subscribes to the
`messages` table via Supabase realtime. The table is added to the
`supabase_realtime` publication in the migration.
