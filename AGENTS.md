# AGENTS.md: Smart App PH workspace rules

You are working on Smart App PH: each small Philippine shop (food or retail) gets its own installable ordering app
(a PWA storefront) and an owner dashboard. Customers order as walk-in, pickup or delivery; they pay cash, cash on
delivery, or GCash/Maya/bank with an uploaded proof the owner checks by hand; they can join as members to collect
stamps and redeem a peso reward. Owners get orders, products and stock, members, basic reports and settings.

This file is the single rulebook for every coding agent (Antigravity, Claude Code, anything else). `CLAUDE.md` only
points here. Read the documents a prompt names before changing code:

| Need | Read |
| --- | --- |
| Scope (what the MVP is) | `docs/system-paper.md` section 4 (if this file and the paper disagree, the paper wins) |
| Track A: finish and launch the MVP | `docs/blueprints/A-MVP-Launch-Blueprint.md` (section 4 is the quality bar for every page) |
| Track B: full product on NestJS | `docs/blueprints/B-Full-Product-NestJS-Blueprint.md` |
| Decisions in force | `docs/decisions.md` |
| Exact versions | `docs/stack-versions.md` |
| Screen plan and UX laws | `docs/ux-plan.md` |
| Names every screen may call | `docs/api-surface.md` |
| What is done, what is next | `docs/PROGRESS.md` |

New ideas go to `docs/system-paper.md` section 11, never into the current prompt.

## Project shape

- Monorepo: pnpm 10.28.0 workspaces + Turborepo 2.11.7, Node 24 LTS, TypeScript 6.0.3 strict. Package scope `@smartapp/*`.
- Two tracks, two integration branches:
  - **Track A (MVP launch)**: branch `dev`. Next.js storefront + Vite dashboard + Supabase. Release `dev` → `main`.
  - **Track B (full product)**: long-lived branch `next`, created from `dev`. Adds `apps/api` (NestJS on Railway,
    Singapore). Supabase stays the database, Auth, Storage and Realtime. Nothing on `next` may touch the live MVP.
- Deploys: Vercel (`storefront` and `dashboard` projects, team `web-serbisyos-projects`, region `sin1`); Supabase
  project "Smart App PH MVP" (Singapore, `ap-southeast-1`, Postgres 17); Resend for Auth email
  (`codes@mail.webserbisyo.com`); Railway for `apps/api` (Track B only).
- Production branch is `main`. A merge into `dev` runs `db-deploy`, which pushes migrations to the hosted database.

```
apps/
  storefront/          Next.js 16 customer app (PWA). Routes in src/app/[shop]/, parts in src/features/<area>/
  dashboard/           Vite 8 owner app (Capacitor later). src/app/ (router, guards, shell, registry),
                       src/features/<area>/ (screens/, components/, hooks/, module.ts)
                       areas: home, orders, products, customers, reports, settings, auth
  api/                 Track B only, on `next`: NestJS API (does not exist on dev)
packages/
  ui/                  SHARED DESIGN: tokens.css, fonts, icons, shadcn/ReUI/DiceUI components, patterns/
  core/                BUSINESS LOGIC: Zod schemas and types, money, time, order rules, vocab, words,
                       feature switches, contracts. No React, no Supabase.
  api/                 BACK-END ACCESS: Supabase clients, queries and mutations per area, TanStack Query
                       hooks, query keys, image upload, generated DB types (package @smartapp/api)
supabase/
  migrations/          tables, RLS, grants, SQL functions (orders, payments, stock, stamps)
  tests/database/      pgTAP tests (run in CI on every PR)
  functions/           Edge Functions (later)
docs/                  system paper, blueprints, decisions, versions, prompts/, PROGRESS.md, CHANGELOG.md
reference/             old code to copy-and-trim from; read-only, never imported, not compiled
tooling/               lint rule tests and their fixtures
```

| You are writing | It goes in |
| --- | --- |
| A storefront page | `apps/storefront/src/app/[shop]/...` (parts in `src/features/<area>/`) |
| A dashboard screen | `apps/dashboard/src/features/<area>/screens/`, registered in that area's `module.ts` |
| A component used by one area | `apps/<app>/src/features/<area>/components/` |
| A component used by both apps | `packages/ui` (`components/` for kit parts, `patterns/` for our own) |
| A rule (totals, next order step, open/closed, stamp progress) | `packages/core` |
| A shape of data and its type | `packages/core/src/schemas/` as a Zod schema, one file per shape |
| A database read or write, or a data hook | `packages/api/src/<area>/` |
| Anything about money, stock or stamps that must be trusted | a SQL function in a new `supabase/migrations` file |
| A new table or column | a new migration file, with its RLS, grants and policies |
| An HTTP route (Track B) | a NestJS module in `apps/api/src/modules/<name>/` |

If something has no clear place, stop and ask.

## Commands

```
pnpm install                       # Node 24, pnpm 10.28.0 (corepack enable)
pnpm check                         # typecheck + lint + test on every package (turbo)
pnpm build                         # both apps (CI runs check, then build)
pnpm dev                           # storefront http://localhost:3000, dashboard http://localhost:5173
pnpm --filter @smartapp/core test  # one task in one package: @smartapp/<storefront|dashboard|ui|core|api|tooling>
pnpm db:start                      # local Supabase in Docker (needed only for database prompts)
pnpm db:test                       # pgTAP tests against the local database
pnpm db:types                      # regenerate packages/api/src/database.types.ts from local migrations
```

Use `localhost`, not `127.0.0.1` (Auth cookies and redirect URLs are set for `localhost`).

## Hard rules (all tracks)

- TypeScript strict. No `any`, no `as` casts to silence errors, no `@ts-ignore` / `@ts-expect-error`, no non-null `!`
  to dodge a check. Fix the type instead.
- Exact versions only (no `^`), from `docs/stack-versions.md`. **No new package without the founder's yes**; say
  which package, the exact version, why, and what you tried without it. Packages must be at least 14 days old.
- Import rules (enforced by `eslint.config.js`, proven by `tooling/lint-rules.test.ts`; never weaken them, move the
  code instead):
  - Only `packages/api` imports `@supabase/*`.
  - `packages/core` has no React, no Supabase, no `@smartapp/ui`, no `@smartapp/api`.
  - `packages/ui` never imports `@smartapp/api`.
  - Apps never import each other. Dashboard features never import each other (shared code goes to `packages/ui`
    or `packages/core`). A new dashboard area must be added to the feature list in `eslint.config.js`.
  - `reference/` is read-only and never imported.
- One source per shape: types come from Zod (`z.infer`) in `packages/core/src/schemas/`. Closed lists live in
  `enums.ts`; database CHECK constraints mirror them. SQL function contracts are in
  `packages/core/src/contracts/db-functions.ts`; names follow system paper 7.4 exactly.
- TypeScript uses camelCase; the snake_case column mapping happens only in `packages/api`.
- Never compare the shop type in code (`if (businessType === 'food')`). Use feature switches and vocab words.
- Money is integer centavos everywhere; show it only through `formatPeso` / `<Money>` (₱, tabular numbers).
- Time: store UTC, show Manila time only through `packages/core/src/time.ts` (`Asia/Manila`).
- Every visible word lives in `packages/core/src/words.ts` (`WORDS`), with vocab words for Menu or Products,
  Kitchen or Packing. The code says tenant, item, catalog, prep; screens say shop, Menu/Products, Kitchen/Packing.
- **No mock data.** Screens run on the real API. Demo data lives only in SQL (`private.demo_reset`) for the demo
  shops `juans-cafe` (food) and `tala-apparel` (retail).
- Secrets: never read, print, paste or commit `.env*` files (only `.env.example` is committed). The apps hold only
  the Supabase URL and the publishable key. The Supabase secret key never goes in an app, a prompt or a chat.
- Every decision the founder approves is written into `docs/decisions.md` in the same PR.

## Git and pull requests (strict)

- Start from the latest target branch: `git switch dev && git pull` (Track B: `next`), then
  `git switch -c ag/<prompt-id>-<short-name>` (example `ag/a2-shop-home`, Track B `ag/n0.2-api-scaffold`).
  Claude Code sessions use `claude/<prompt-id>-<short-name>` or the branch the session was given.
- **Never push to `main`, `dev` or `next`. Never merge. Never force-push, never `reset --hard`, never rebase a branch
  someone else pushed to.** A push to `dev` deploys migrations to the hosted database. The founder merges.
- One commit per numbered step of the prompt, Conventional Commits with the prompt id as scope:
  `feat(a2): best sellers scroller`, `fix(d2): board count on focus`, `test(a0.3): route smoke tests`,
  `docs(a0.1): agents rulebook`, `chore: ...`.
- Before pushing: `pnpm check` and `pnpm build` green. Then `git push -u origin <branch>` and open a PR **into `dev`**
  (Track B: **into `next`**) with `.github/pull_request_template.md` filled in
  (`gh pr create --base dev --fill` then edit the body, or the "Compare & pull request" button on GitHub).
- Never commit `.env*`, keys, tokens, `.vercel/`, or screenshots that show a real customer's name, phone or address.

## Database rules (Supabase)

- Schema changes only as a **new** file in `supabase/migrations/` (`YYYYMMDDHHMMSS_short_name.sql`, newer than the
  newest file). RLS enabled, grants and policies in the same file. Grant explicitly to `anon` / `authenticated`;
  never rely on default exposure. Never edit an applied migration.
- Trusted logic (prices, totals, stock, stamps, payment state, order transitions) lives in `security definer` SQL
  functions with `set search_path = ''`; helpers go in the `private` schema. Clients never write those tables.
- Every shop-owned table carries `tenant_id`; every policy checks shop membership. A cross-shop pgTAP test proves it.
- After a migration: `pnpm db:start`, `pnpm db:test`, `pnpm db:types`, and commit
  `packages/api/src/database.types.ts` (CI fails if it differs).
- **Never** run `supabase link`, `supabase db push`, `supabase db reset --linked`, `supabase config push` or any
  command against a hosted project. **Never** change the database through the Supabase MCP, the dashboard or the
  SQL editor. Only the `db-deploy` GitHub Action deploys, after the founder merges.
- The Supabase MCP is read-only and scoped to one project: use it to list tables, read logs and advisors, and
  search docs. If it ever offers a write, do not use it.

## Storefront rules (`apps/storefront`, Next.js 16)

- App Router. `params` and `searchParams` are async (`await params`). Session refresh is in `proxy.ts`, not
  `middleware.ts`. Next.js is never below 16.3.8.
- Before using a Next API, read the matching guide in `apps/storefront/node_modules/next/dist/docs/` (see
  `apps/storefront/AGENTS.md`); this Next version differs from older training data.
- Server components by default; `'use client'` only for interactive parts (sheets, cart, forms, live receipt).
- Data comes from `@smartapp/api` (`createStorefrontServerClient`, `getStorefront`, the hooks). Server code checks the
  user with `getVerifiedUser()` / `getClaims()`, never with an unverified cookie session.
- Images through `next/image` with `sizes` and a fixed aspect ratio. Cart state stays in the cart feature store.
- Light mode only. Shop colours only through `--shop-60`, `--shop-30`, `--shop-10` (ShopTheme); status colours never
  follow shop colours.
- First-load JavaScript budget: 200 kB gzipped per page.

## Dashboard rules (`apps/dashboard`, Vite 8 + React 19)

- TanStack Router 1.x, code-based routes. A screen is added by listing it in its area's `module.ts`
  (`defineAppModule`, lazy `screen: () => import(...)`); the registry builds nav and routes. Guards live in
  `src/app/guard.ts`.
- Server state only through TanStack Query hooks from `@smartapp/api` (query keys in `packages/api/src/keys.ts`).
  Screens never build queries by hand and never call Supabase.
- Forms: React Hook Form + `@hookform/resolvers/zod` with the schema from `@smartapp/core`. Unsaved forms use
  `LeaveGuard`.
- Light and dark mode both checked. Owner-only app: no customer data in logs or `console`.

## Shared packages

- `packages/ui`: shadcn on **Base UI** (style `base-nova`, CLI `pnpm dlx shadcn@4.21.4 add <name>` run inside
  `packages/ui`), plus ReUI, DiceUI and two Magic UI parts (confetti, number ticker). Do not hand-write or heavily
  edit files in `components/`; extend through `patterns/`. Icons: Tabler only, through `@smartapp/ui/icons`;
  Fluent 3D objects from `@smartapp/ui/assets/fluent` for tiles and categories.
- Reuse before creating. Check `packages/ui/src/patterns` first: AppShell, BottomDock, CartBar, CategoryIcon,
  CodeInput, CopyButton, EmptyPage, Money, MoreMenu, OfflineBanner, OrderCard, OrderLines, OrderTimeline, PageBody,
  PesoField, PhoneField, PhotoField, ProductCard, QuantityStepper, QueryState, SalesBars, SettingsSection,
  ShareShop, ShopHeader, StampCard, StatusBadge, StickyActionBar, StoreTabBar, TopBar. Kit parts include
  `responsive-dialog`, `qr-code`, `stat`, `status`, `scroller`, `sortable`, `file-upload`, `reui/data-grid`.
- Hooks in `packages/ui/src/hooks`: `use-online`, `use-form-factor`, `use-keyboard-open`, `use-keyboard-inset`,
  `use-countdown`. Toasts only through `@smartapp/ui/components/sonner`. Image compression only through
  `@smartapp/ui/lib/compress-image`.
- `packages/core`: pure functions with Vitest tests next to them (`money.ts` + `money.test.ts`). Status look comes
  from `STATUS_LOOK` / `orderStatusLook()` / `paymentLook()` in `status-look.ts`; order buttons from `nextActions()` in `order-rules.ts`.
- `packages/api`: one folder per area (`orders/`, `catalog/`, ...) with queries, mutations and `hooks.ts`. Errors
  map to the codes in `errors.ts`. Track B adds a transport switch here (`rpc` or `http` per area); screens never
  know which door was used.

## API rules (`apps/api`, NestJS, Track B on `next` only)

- Do not create `apps/api` outside a Track B prompt. Its package name must not be `@smartapp/api` (taken by
  `packages/api`). Versions are pinned in `docs/stack-versions.md` by the scaffold prompt (N0.2).
- NestJS on Node 24, built with the Nest CLI webpack builder (it must bundle `@smartapp/core`, which exports
  TypeScript source; plain esbuild drops decorator metadata). Dockerfile at `apps/api/Dockerfile`, `turbo prune`.
- Data access: Drizzle ORM with the `postgres` driver over the Supavisor transaction pooler (port 6543, prepared
  statements off). The schema stays owned by `supabase/migrations`: `drizzle-kit pull` only, never `drizzle-kit
  push` or Drizzle migrations. The pulled schema is committed and checked in CI.
- Every request's database work runs through the one request-transaction helper: `set local role authenticated`,
  `set_config('request.jwt.claims', <verified claims>, true)`, work, commit. Only `apps/api/src/db/` imports the
  database client. The API logs in as `api_user` (no `bypassrls`, no grants of its own).
- Auth: `AuthGuard` verifies the Supabase access token with `jose` against the project JWKS (signature, `exp`,
  `iss`, `aud = authenticated`). Global guard chain: Throttler, Auth, Tenant, Permission. `TenantGuard` reads the
  shop from `tenant_members`, never from the URL or body. Every route has `@Public()` or `@Can('<permission>')`; a
  metadata test fails the build otherwise.
- Money, stock and stamp rules stay in SQL. The API calls the same SQL functions as the apps; it never
  re-implements a price, a stock change or a stamp in TypeScript.
- Contracts: request and response Zod schemas in `packages/core/src/contracts/api/`, validated by the
  `ZodValidationPipe`. One error shape `{ code, message }`.
- The Supabase secret key is used only in `StaffModule` and `JobsModule`. The API never changes the schema; no
  migrations run on Railway.
- Logs: `nestjs-pino`, JSON, request id; redact `authorization`, phone, email and address. `GET /health` runs
  `select 1`. Helmet, CORS allow-list, 100 kB body limit, `trust proxy` 1.
- Every module ships a cross-shop end-to-end test: shop A's token calling shop B's ids gets 403 or 404.

## UX rules (every page, both tracks)

Blueprint A section 4 is the full bar. In short:

- Every page has: loading skeleton in the content's shape (shell stays), empty state (Fluent icon, one line, one
  action), error state (what failed + Try again), data state; plus offline (`OfflineBanner`, network actions
  disabled with the reason), closed or paused shop (storefront), long names (one line, ellipsis), big amounts
  (₱12,345.50 fits), keyboard open (action bar above it). `QueryState` handles loading, error and empty.
- Responsive at 360, 390, 768, 1024, 1280 px (dashboard also 1536). No sideways scroll. Tables become rows or cards
  below `md`. Create/edit forms open in `responsive-dialog` (drawer on phones). `PageBody` widths: full 1600, wide
  1280, settings 880, form 720, narrow 480.
- Touch targets at least 44 px; inputs at least 16 px text on phones.
- Colours only from `packages/ui/src/styles/tokens.css`; never hex or raw Tailwind palette colours in components. One
  filled main button per screen. Status is icon + word + colour (`STATUS_LOOK` via `StatusBadge`), never colour alone. Marigold
  `highlight` only to celebrate; member green only for members.
- Accessibility: visible focus ring, `aria-label` and a tooltip on icon-only buttons, AA contrast (4.5:1), charts
  with a screen-reader sentence.
- Motion: CSS with the tokens (`--duration-fast` 120 ms, `--duration-base` 200 ms, `--duration-slow` 300 ms,
  `--ease-out-soft`); page enter is fade + 8 px rise; lists stagger 40 ms, first 6 items only. Nothing longer than
  400 ms. `prefers-reduced-motion`: opacity only, no confetti. Confetti only when a reward is reached; number ticker
  only on Home "Sales today".
- Destructive actions use a confirm dialog; cancelling an order needs a reason. Stock never goes negative.
- Copy: short, warm, verb buttons ("Place order", "Mark as paid"). Plain English with Filipino words people use
  (Suki, GCash, Sukli). Demo shops: Juan's Cafe and Tala Apparel.

## Verify before you say done

1. `pnpm check` and `pnpm build` green (paste the last lines).
2. `pnpm dev`, then open the changed pages in your browser: `http://localhost:3000/juans-cafe` and
   `http://localhost:3000/tala-apparel`, dashboard `http://localhost:5173`. Both demo shops.
3. Walk every state from the UX rules. 0 console errors and 0 React warnings.
4. Screenshots of every changed page at **390 px** and **1280 px** (dashboard also dark mode at 1280; boards also
   768), attached to the PR.
5. Test the prompt's "Done when" list yourself.
6. Tick the prompt in `docs/PROGRESS.md` (at most 2 log lines) and add one line to `docs/CHANGELOG.md` under
   "Unreleased".

## Using tools and connectors (MCP and CLIs)

| Tool | Allowed | Never |
| --- | --- | --- |
| Supabase MCP (read-only, one project) | list tables and migrations, read logs and advisors, search docs, generate types to compare | any write, `apply_migration`, `execute_sql` that changes data, Edge Function deploys |
| Supabase CLI | `supabase start`, `db reset` (local), `test db`, `gen types --local`, `migration new` | `link`, `db push`, `config push`, anything with `--linked` or `--project-ref` |
| Vercel MCP / CLI | read deployments, build logs, runtime logs, docs | deploy, promote, roll back, change env vars, domains or DNS, `vercel --prod` |
| Resend MCP / CLI | read domains, logs and email status, search docs | send email, change domains, DNS, API keys or contacts |
| GitHub (`gh`) | push your own branch, open and edit your PR, read CI logs | push or merge `main`/`dev`/`next`, change settings or secrets |

Anything in the "never" column needs the founder to do it, or their explicit yes in the chat for that one action.

## Working style

- Do only the current prompt. Before coding, post a short plan: the files you will touch and one line per step.
  Wait for the founder's OK when the plan changes the database, adds a package, or touches more than the prompt says.
- Stop and ask when: a new package seems needed, a lint rule would have to be weakened, a file has no clear place,
  `docs/api-surface.md` is missing something a screen needs, or the prompt is bigger than it looks.
- If a command or package name fails (versions change), check the current official docs, use the closest correct
  equivalent, and say what you changed and why.
- Keep commits small and the PR to one prompt.
- Finish with 5 lines and the PR link: what changed · how to test · what you decided · what is missing · what the
  founder must do by hand.
