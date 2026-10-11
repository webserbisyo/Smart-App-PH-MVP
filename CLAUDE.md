# Smart App PH: rules for AI agents

Smart App PH gives each small Philippine shop (food or retail) its own installable ordering app (a PWA storefront) and an owner dashboard. The MVP is: customers order as walk-in, pickup or delivery; they pay cash, cash on delivery, or GCash/Maya/bank with an uploaded proof that the owner checks by hand (manual payment check); and they can join as members to collect stamps and redeem a reward. Owners get one dashboard for orders, products and stock, members, basic reports and shop settings. Full scope: `docs/system-paper.md` section 4. Work plan: `docs/build-plan.md`. Decisions: `docs/decisions.md`. Versions: `docs/stack-versions.md`.

If this file and docs/system-paper.md disagree, the paper wins. New ideas go to docs/system-paper.md section 11, not into the current checkpoint.

## Folder map (system paper 8.3)

```
apps/                  FRONT END: screens only
  storefront/          Next.js customer app (PWA); routes in src/app/[shop]/, src/features/<area>/
  dashboard/           Vite owner app (Capacitor later); src/app/ (router, guards, shell, registry),
                       src/features/<area>/ (screens/, components/, hooks/, module.ts)
                       areas: home, orders, products, customers, reports, settings, auth
packages/
  ui/                  SHARED DESIGN: tokens.css, fonts, icons, shadcn components, shared patterns
  core/                BUSINESS LOGIC: Zod schemas and types, money, order statuses and next
                       actions, open/closed hours, vocab, feature switches. No React, no Supabase.
  api/                 BACK-END ACCESS: Supabase clients, queries and mutations per area, TanStack
                       Query hooks, image upload + compression, generated DB types, mock data
supabase/              BACK END
  migrations/          tables, RLS, SQL functions (orders, payments, stock, stamps)
  functions/           Edge Functions (later)
docs/                  system paper, build plan, decisions, stack versions, prompts/
reference/             old code to copy-and-trim from; read-only, never imported, not compiled
tooling/               lint rule tests and their fixtures
```

| You are writing | It goes in |
| --- | --- |
| A screen or page | `apps/dashboard/src/features/<area>/screens`, or the `src/app` routes of the storefront |
| A component used by one area | `apps/<app>/src/features/<area>/components` |
| A component used by both apps (button, card, status badge, uploader) | `packages/ui` |
| A rule (totals, next order step, open or closed, stamp progress) | `packages/core` |
| A shape of data (order, item, customer) and its type | `packages/core` as a Zod schema |
| A database read or write, or a data hook | `packages/api` |
| Anything about money, stock or stamps that must be trusted | A SQL function in `supabase/migrations` |
| A new table or column | A new migration file, with its RLS and grants |

## Commands

```
pnpm install                       # Node 24 LTS, pnpm (version pinned in package.json)
pnpm check                         # typecheck + lint + test on every package (turbo)
pnpm --filter @smartapp/core test  # one task in one package: @smartapp/<storefront|dashboard|ui|core|api|tooling>
```

## Rules

From the Build Plan, "CLAUDE.md rules (short version)":

- Do only the current checkpoint. List the files you will touch first.
- Put code where the folder map says. If something has no clear place, stop and ask.
- Finish with pnpm check green (typecheck, lint, tests).
- Never read or print .env.local. No new packages without asking.
- No any, no type casts to silence errors, no @ts-ignore.
- Never compare the shop type in code; use feature switches and vocab words.
- Database changes only as new migration files; RLS, grants and policies in the same file.
- Money in centavos, Manila time for display, every visible text in one words file.

Also:

- Apps never import each other.
- Only `packages/api` imports `@supabase/*`.
- `packages/core` has no React and no Supabase.
- Dashboard features never import each other.
- Never edit an applied migration.
- `reference/` is read-only and never imported.

The import rules are enforced by `eslint.config.js` and proven by `tooling/lint-rules.test.ts`. Do not weaken them to make a check pass; move the code to the right place instead.

## Conventions

- Package scope is `@smartapp/*`. TypeScript uses camelCase; the snake_case column mapping happens in `packages/api`.
- Types come from Zod schemas (`z.infer`) in `packages/core/src/schemas/`, one file per shape. Closed lists live in `enums.ts`; the database CHECK constraints mirror them.
- Database function names follow system paper 7.4 exactly; their contracts are in `packages/core/src/contracts/db-functions.ts`.
- The code says tenant, item, catalog, prep; screens say shop, Menu or Products, Kitchen or Packing (vocab words).
