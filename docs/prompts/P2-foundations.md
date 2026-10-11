# Checkpoint P2: Foundations (stack, look, layouts, Supabase link, Vercel previews)

Build Plan v1.1, Phase 2, checkpoints 2.1 to 2.5. Checkpoint 2.6 (Resend) is a separate prompt, `docs/prompts/P2.6-resend-email.md`, because it needs the platform domain. System paper sections 8.1, 8.2, 8.3, 9.1 to 9.3.

To run it, paste this one line into a Claude Code session on `webserbisyo/Smart-App-PH-MVP`:

> Read docs/prompts/P2-foundations.md and do exactly that checkpoint.

---

## Goal

Both apps run locally and on Vercel preview links, in the final look, with both layouts and empty pages, and the repo is linked to the Supabase project, before any feature is built.

## Read first

`CLAUDE.md`, `docs/stack-versions.md`, `docs/decisions.md`, system paper 8.1 to 8.3 and 9.1 to 9.3, and `reference/README.md`. Start with a short plan that lists every file you will create or change, then build.

## Build only

### 1. Stack install (2.1)

Install at the exact versions in `docs/stack-versions.md` (check the latest patch with `npm view <pkg> version`; never Next below 16.3.8; no `^`). Update the table to "installed" with the real versions.

- `apps/storefront`: `next`, `react`, `react-dom`, `@tailwindcss/postcss`. App Router under `src/app`. `next.config.ts` with `transpilePackages: ['@smartapp/ui', '@smartapp/core', '@smartapp/api']` (the packages export TypeScript source).
- `apps/dashboard`: `vite`, `@vitejs/plugin-react`, `react`, `react-dom`, `@tanstack/react-router` (code-based routes, no router plugin), `@tanstack/react-query`, `@tailwindcss/vite`, `react-hook-form`, `@hookform/resolvers`.
- `packages/ui`: `tailwindcss`, `@tabler/icons-react`, `@fontsource-variable/plus-jakarta-sans`, and the packages the shadcn CLI adds for `button` (`class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`, Radix slot). React is a peer dependency.
- `packages/api`: `@tanstack/react-query` only for now (Supabase client packages come in P3b).
- Root: `supabase` CLI as a devDependency, pinned. pnpm 10 blocks install scripts: add only the packages that truly need one to `onlyBuiltDependencies` in `pnpm-workspace.yaml`, and list them in your final reply.
- `eslint-plugin-react-hooks` in the root ESLint config for `apps/**` and `packages/ui/**`.

These packages are pre-approved. Anything else: stop and ask.

Replace the placeholder `typecheck` and `lint` scripts in both apps with real `tsc --noEmit` and `eslint .` (decision P1-7 ends here). Add `dev` and `build` scripts to both apps and turbo tasks `dev` (persistent, no cache) and `build` (outputs `.next/**`, `dist/**`). Root `pnpm dev` starts both apps; `pnpm check` stays typecheck + lint + test. Add a GitHub Actions workflow `.github/workflows/check.yml`: on push and pull request, Node 24, pnpm from `packageManager`, `pnpm install --frozen-lockfile`, `pnpm check`, then `pnpm build`.

### 2. Look and tokens in `packages/ui` (2.2)

- `packages/ui/src/styles/tokens.css`: copy-and-trim from `reference/packages/ui/src/styles/tokens.css`. Keep navy, logo blue, marigold (celebrations only), member green, neutral greys, status colours, light and dark. Drop ReUI-only names.
- `packages/ui/src/styles/globals.css`: `@import "tailwindcss"`, `tw-animate-css`, the tokens, the font, and an `@theme inline` block mapping tokens to Tailwind colours, radius and `--font-sans: "Plus Jakarta Sans Variable"`. Dark mode by a `.dark` class (custom variant), not the media query, so the dashboard can offer a switch later.
- Shop colours: `--shop-60`, `--shop-30`, `--shop-10` plus their `-foreground` text colours, set on a wrapper element from the shop's three hex colours. Put the contrast picker (`readableTextOn(hex)`: black or white text, whichever passes 4.5:1) in `packages/core/src/color.ts` with tests; `packages/ui` exports a tiny `ShopTheme` component that sets the variables.
- shadcn: one `components.json` in `packages/ui` (aliases into `packages/ui/src`), `button` installed with the shadcn CLI, exported from `@smartapp/ui`. Each app's CSS imports `@smartapp/ui/globals.css` and adds `@source` for `packages/ui/src` so Tailwind sees the classes.
- Prove it: the same `<Button>` in its default and `variant="outline"` renders identically in both apps (same font, colour, radius, height 44 px) before going on.

### 3. Two layouts with empty pages (2.3)

Words: every visible text comes from one words file. Create `packages/core/src/words.ts` (English strings, nav labels, empty-page text) and `packages/core/src/vocab.ts` (a lookup `VOCAB[businessType]` with `catalog: 'Menu' | 'Products'`, `item`, `prep: 'Kitchen' | 'Packing'`). The lookup is the only place the business type picks words; nothing else branches on it.

Storefront (`apps/storefront`):
- Routes `src/app/[shop]/` with empty pages: home, `menu`, `orders`, `account`. `params` is async (Next 16).
- Phone: bottom bar Home · Menu (vocab) · Orders · Account with Tabler icons, and a floating cart bar above it (static "Cart · 0 items ₱0"). Desktop (≥ 1024 px): top navigation and an empty cart drawer on the right.
- The shop name and business type come from a stub `getShopStub(slug)` in `packages/api/src/stubs.ts` that knows `juans-cafe` (food, three colours) and `tala-apparel` (retail, three other colours); any other slug renders Next's not-found page. P4 replaces the stub with mock data, P5 with Supabase.
- The storefront is wrapped in `ShopTheme` with the shop's colours. **Light only** (decision below).
- `/` shows one line: "Open a shop link, for example /juans-cafe".

Dashboard (`apps/dashboard`):
- Copy-and-trim the module type and registry from `reference/apps/dashboard/src/app/module.ts`, `registry.ts` and `reference/packages/core/src/modules.ts`: `defineAppModule({ id, nav: { label, icon, order, placement }, routes })`. Registry in `src/app/registry.ts`, one line per feature. A new feature is a new folder plus one registry line.
- Features with a `module.ts` and one empty screen each: `home`, `orders`, `products`, `customers`, `reports`, `settings`. (`auth` comes in P3b.) Screens are lazy-loaded.
- Shell, copy-and-trim from `reference/apps/dashboard/src/app/shell/` and `reference/packages/ui/src/patterns/AppShell.tsx`:
  - desktop: navy sidebar (Home, Orders, Products, Customers, Reports, Settings), collapsible to icons, shop name and logo placeholder on top, account at the bottom
  - phone: bottom bar Home · Orders · Products · Customers · More, where More opens a sheet with Reports and Settings
  - top bar with breadcrumbs built from the route
  - a light/dark switch in the account menu, saved in localStorage
- No POS, staff, dine-in or other areas from the reference shell.

Both apps: no page scrolls sideways at 390 px; touch targets ≥ 44 px.

### 4. Supabase link (2.4)

The project "Smart App PH MVP" already exists (Singapore, empty). Do not create another and do not change its schema in this checkpoint.

- `supabase init` at the repo root (`supabase/config.toml`; keep `migrations/` and `functions/`). Set `project_id` to `smart-app-ph`.
- `.env.example` in each app with names only:
  - storefront: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - dashboard: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- Add a typed env reader in each app (`src/env.ts`) that parses these with Zod and fails with a clear message when missing. Nothing uses Supabase yet.
- Migration deploys run from GitHub Actions, never from a laptop or the connector: `.github/workflows/db-deploy.yml`, on push to `dev` when `supabase/migrations/**` changes, plus manual `workflow_dispatch`. It uses `supabase/setup-cli` pinned to the CLI version, then `supabase link --project-ref "$SUPABASE_PROJECT_REF"` and `supabase db push`, with `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` from repository secrets and `SUPABASE_PROJECT_REF` from a repository variable. If the direct database host fails on IPv6, use the session pooler connection (`--db-url` built from secrets) and note it. With no migrations yet, a manual run must finish green ("Remote database is up to date").

### 5. Vercel (2.5)

Add `apps/dashboard/vercel.json` with a rewrite of every path to `/index.html` (SPA). Write `docs/deploy.md` with the exact Vercel import settings below and the env var names. You cannot create the Vercel projects; the founder does that by hand.

## Do not build

- No Supabase client code, auth, migrations or tables (P3).
- No screens beyond empty pages, no mock data beyond the two-shop stub, no other shadcn components (P4 installs them once, as a set).
- No PWA manifest, service worker or icons (P5.2 and P6).
- No dark mode on the storefront, no theme editor, no shop subdomains.
- No Resend or SMTP setup (P2.6).

## Rules

- `pnpm check` green, and `pnpm build` green for both apps.
- No packages beyond the list above without asking. No `any`, no casts, no `@ts-ignore`.
- Never read or print `.env.local`.
- Keep the import rules in `eslint.config.js`; do not weaken them.
- Add these lines to `docs/decisions.md` under "## Phase 2":
  - P2-1: Storefront is light-only at launch, themed by the shop's 60/30/10 colours; the dashboard has light and dark.
  - P2-2: Migrations reach the hosted project only through the `db-deploy` GitHub Action on `dev`.
  - P2-3: Words live in `packages/core/src/words.ts`; Menu/Products-style words come from `VOCAB[businessType]` only.

## What the founder does by hand (put these steps in `docs/deploy.md` and in your final reply)

Keys go into `.env.local`, GitHub and Vercel settings, never into chat.

1. **GitHub secrets** (repo Settings → Secrets and variables → Actions): secrets `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access Tokens) and `SUPABASE_DB_PASSWORD` (the project's database password); variable `SUPABASE_PROJECT_REF` (Project Settings → General → Reference ID). Then run the `db-deploy` workflow once by hand.
2. **Vercel**: the two projects `storefront` and `dashboard` already exist (they fail to build until this checkpoint adds Next.js and Vite). Check their settings:
   - `storefront`: Root Directory `apps/storefront`, Framework Next.js, Node.js 24.x, default install and build commands, "Include files outside the root directory" on.
   - `dashboard`: Root Directory `apps/dashboard`, Framework Vite, Output Directory `dist`, Node.js 24.x, same include setting.
   - `storefront` → Settings → Functions → Function Region: **Singapore (sin1)**, next to the Supabase project. The default (Washington, iad1) adds a US round trip to every server-rendered page.
   - Env vars (Production and Preview) from Supabase → Project Settings → API Keys: the URL and the **publishable** key only. Never the secret key.
   - Production Branch stays `main`; every push to `dev` gets preview links.
3. **Local** (only if running on your own computer): copy each `.env.example` to `.env.local` and fill in the two values.

## Done when (I will test on a phone)

- `pnpm dev` starts both apps with their layouts.
- `/juans-cafe` shows Menu in the bottom bar and Juan's colours; `/tala-apparel` shows Products and Tala's colours.
- Dashboard: sidebar on desktop, bottom bar with More on phone, breadcrumbs, every empty page reachable.
- The same Button looks identical in both apps; dashboard light and dark both look right.
- No page scrolls sideways at 390 px.
- `pnpm check` is green locally and in the `check` workflow; the `db-deploy` workflow runs green by hand.
- Both Vercel preview links open on a phone.

## Finish

Commit `feat(p2): stack, tokens, layouts, supabase link, deploy setup`, push `dev` (if the session may only push its own `claude/…` branch, push that and say so; I will merge it into `dev`), then reply in 5 lines: what changed, installed versions, packages added to `onlyBuiltDependencies`, anything you had to decide, and the by-hand steps left for me.
