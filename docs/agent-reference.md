# Agent reference: details behind AGENTS.md

Read a section only when the prompt touches that area. `AGENTS.md` holds the general rules; the NestJS API rules
are in `docs/blueprints/B-Full-Product-NestJS-Blueprint.md` section 9 and the full UX bar in
`docs/blueprints/A-MVP-Launch-Blueprint.md` section 4.

## Where code goes

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

## Database rules (Supabase)

- Schema changes only as a **new** file in `supabase/migrations/` (`YYYYMMDDHHMMSS_short_name.sql`, newer than the
  newest file). RLS enabled, grants and policies in the same file. Grant explicitly to `anon` / `authenticated`;
  never rely on default exposure. Never edit an applied migration.
- Trusted logic (prices, totals, stock, stamps, payment state, order transitions) lives in `security definer` SQL
  functions with `set search_path = ''`; helpers go in the `private` schema. Clients never write those tables.
- Every shop-owned table carries `tenant_id`; every policy checks shop membership. A cross-shop pgTAP test proves it.
- Work against the local stack (`docs/local-dev.md`): full access there. After a migration: `pnpm local reset`,
  `pnpm db:test`, `pnpm db:types`, and commit `packages/api/src/database.types.ts` (CI fails if it differs).
- The CLI may be linked to the hosted project (reads only). **Never** run `supabase db push`, `db reset --linked`,
  `migration repair`, `config push` or any command that writes to it. **Never** change the hosted database through
  the Supabase MCP, the dashboard or the SQL editor. Only the `db-deploy` GitHub Action deploys, after the founder merges.
- A PR that adds or changes a `public.` SQL function, a hook or a plain function in `packages/api` updates
  `docs/api-surface.md` in the same PR.
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

## Using tools and connectors (MCP and CLIs)

| Tool | Allowed | Never |
| --- | --- | --- |
| Supabase MCP (read-only, one project) | list tables and migrations, read logs and advisors, search docs, generate types to compare | any write, `apply_migration`, `execute_sql` that changes data, Edge Function deploys |
| Supabase CLI | everything local (`pnpm local ...`, `test db`, `gen types --local`, `migration new`); read-only commands on the linked project (`migration list`) | `db push`, `db reset --linked`, `migration repair`, `config push`, any other write to the linked project |
| Vercel MCP / CLI | read deployments, build logs, runtime logs, docs | deploy, promote, roll back, change env vars, domains or DNS, `vercel --prod` |
| Resend MCP (no CLI) | read domains, logs and email status, search docs | send email, change domains, DNS, API keys or contacts |
| GitHub (`gh`) | push your own branch, open and edit your PR, read CI logs | push or merge `main`/`dev`/`next`, change settings or secrets |

Anything in the "never" column needs the founder to do it, or their explicit yes in the chat for that one action.
