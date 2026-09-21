<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Direction créative

`DIRECTION-CREATIVE.md` à la racine : le mode de travail créatif, les 50
connecteurs à mobiliser, et le standard de sortie. À lire avant toute
décision de direction artistique. Les règles techniques et de sécurité de
`sales-app/AGENTS.md` priment toujours dessus.

## Context7

`.mcp.json` déclare **Context7** en HTTP (`https://mcp.context7.com/mcp`),
sans authentification, pré-approuvé dans `.claude/settings.json`. Il sert à
lire la doc à jour d'une librairie plutôt que de se fier à sa mémoire —
`resolve-library-id` exige **`libraryName` ET `query`**, les deux.

Exception qui compte ici : pour **Next lui-même**, la doc faisant foi reste
`node_modules/next/dist/docs/`. Le dépôt est sur Next 16.3.4, et Context7
n'indexe pas encore cette version. Context7 sert pour tout le reste —
React 19, Tailwind 4, Supabase, Zod 4, web-push.
