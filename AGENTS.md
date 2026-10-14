# AGENTS.md: Smart App PH workspace rules

You are working on Smart App PH: each small Philippine shop (food or retail) gets its own installable ordering app
(PWA storefront) and an owner dashboard. Customers order walk-in, pickup or delivery, pay cash, COD or
GCash/Maya/bank with a proof the owner checks by hand, and join as members to collect stamps.

The plan lives in `docs/blueprints/` (A = MVP launch, B = full product on NestJS). Read the sections a prompt
names before changing code. Details per area: `docs/agent-reference.md`. Decisions: `docs/decisions.md`. Versions:
`docs/stack-versions.md`. Progress: `docs/PROGRESS.md`. If anything disagrees with `docs/system-paper.md`, the paper wins.

## Project shape

- pnpm 10.28.0 + Turborepo monorepo, Node 24, TypeScript strict, packages `@smartapp/*`.
- `apps/storefront`: Next.js 16 customer PWA (Vercel `sin1`). `apps/dashboard`: Vite 8 + React 19 + TanStack
  Router/Query owner app. `apps/api`: NestJS on Railway, Track B only, exists only on `next`.
- `packages/core`: Zod schemas, money, time, order rules, words (no React, no Supabase). `packages/ui`: tokens,
  shadcn (Base UI) + ReUI + DiceUI kit, shared patterns. `packages/api`: the only Supabase client, TanStack Query hooks.
- `supabase/migrations`: tables, RLS, SQL functions (money, stock, stamps). Supabase project in Singapore.
- Branches: `main` = production, `dev` = Track A integration, `next` = Track B integration. A merge into `dev`
  deploys migrations to the hosted database through the `db-deploy` Action.

## Commands

`pnpm install` · `pnpm check` (typecheck, lint, test) · `pnpm build` · `pnpm dev` (storefront
http://localhost:3000, dashboard http://localhost:5173; use `localhost`, not `127.0.0.1`) · `pnpm db:start`,
`pnpm db:test`, `pnpm db:types` (local Supabase in Docker, database prompts only).

## Hard rules

- **Never push to `main`, `dev` or `next`, never merge, never force-push or `reset --hard`.** Branch
  `ag/<prompt-id>-<name>` from the latest `dev` (Track B: `next`) and open a PR into it. The founder merges.
- Database changes only as a **new** file in `supabase/migrations/`, with RLS, grants and policies in the same file.
  Never edit an applied migration. Never run `supabase link` / `db push`, and never change the hosted database
  through MCP, the dashboard or the SQL editor. After a migration run `pnpm db:types` and commit the types.
- No `any`, no `as` casts to silence errors, no `@ts-ignore`. Types come from Zod schemas in `packages/core`.
- Only `packages/api` imports `@supabase/*`. Apps never import each other; dashboard features never import each
  other. Never weaken `eslint.config.js` to pass; move the code.
- Money is integer centavos, shown with `formatPeso` / `<Money>`. Dates shown in Manila time via `core/time.ts`.
  Every visible word in `core/words.ts`; never compare the shop type in code (use vocab and feature switches).
- No mock data. Demo shops `juans-cafe` and `tala-apparel` come from SQL (`private.demo_reset`).
- Use the installed UI kit, `packages/ui/src/patterns` and `tokens.css` (no hex colours, Tabler icons only). No new
  package without the founder's yes (exact version, no `^`).
- Never read, print or commit `.env*` files, keys or tokens. MCP connectors (Supabase, Vercel, Resend) are read-only.
- Every decision the founder approves goes into `docs/decisions.md` in the same PR.

## Per area (one line each; details in `docs/agent-reference.md`)

- Storefront: App Router, async `params`, `proxy.ts` (not middleware), server components first, light mode only,
  shop colours via `--shop-*` tokens. Check `node_modules/next/dist/docs/` before using a Next API.
- Dashboard: screens in `src/features/<area>/screens`, registered in that area's `module.ts`; data only through
  `@smartapp/api` hooks; forms with React Hook Form + Zod; check light and dark mode.
- Supabase: trusted logic in `security definer` SQL functions with `set search_path = ''`; a cross-shop pgTAP test
  for every shop table.
- NestJS (`next` only): follow Blueprint B section 9. Rules for money, stock and stamps stay in SQL; every route has
  `@Public()` or `@Can()`; Drizzle never owns the schema.

## UX checks (every page)

- States: loading skeleton, empty with one action, error with Try again, offline, plus closed shop, long names and
  big amounts where they apply. Full bar: Blueprint A section 4.
- No sideways scroll from 360 to 1280 px; touch targets 44 px; inputs 16 px; status shown with icon and word, not colour alone.
- Motion subtle (under 400 ms) and off for `prefers-reduced-motion`.

## Working style

- Do only the current prompt. Post a short plan first (files and steps); wait for an OK when it adds a package,
  changes the database, or goes beyond the prompt. Stop and ask when something has no clear place.
- One commit per step: `feat(a2): ...`, `fix(d2): ...`, `docs(...)`.
- Before the PR: `pnpm check` and `pnpm build` green; open each changed page with both demo shops, 0 console
  errors; screenshots at 390 and 1280 px in the PR; tick `docs/PROGRESS.md`, one line in `docs/CHANGELOG.md`.
- If a command or package name fails, check the current official docs, use the closest equivalent, say what changed.
- Finish with 5 lines and the PR link: what changed, how to test, what you decided, what is missing, what the
  founder must do by hand.
