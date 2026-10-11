# Checkpoint P1: Repo, context and folder rules

Build Plan v1.1, Phase 1 (checkpoints 1.1 to 1.5). System paper sections 3.1, 4, 7, 8.3, 15.

## Setup already done

The repo is `webserbisyo/Smart-App-PH-MVP`. The two source PDFs are committed at `docs/_source/1-System-Paper-v1.1.pdf` and `docs/_source/2-Build-Plan-v1.1.pdf`, and this prompt is at `docs/prompts/P1-repo-and-folder-rules.md`. Branches `main` and `dev` exist. Work on `dev`.

To run it, paste this one line into a Claude Code session on that repo:

> Read docs/prompts/P1-repo-and-folder-rules.md and do exactly that checkpoint.

---

## Goal

A clean pnpm + Turborepo monorepo where every AI session starts from the same rules, the same plan and the same data shapes, and the lint config makes it impossible to put code in the wrong place.

## Read first

`docs/_source/1-System-Paper-v1.1.pdf` (all of it) and `docs/_source/2-Build-Plan-v1.1.pdf` (Phase 1). These two documents are the source of truth. Start with a short plan that lists every file you will create, then build.

## Build only

### 1. Repo and workspace

- pnpm workspace + Turborepo, Node 24 LTS, `packageManager` pinned in the root `package.json`.
- Folders exactly as system paper 8.3:
  - `apps/storefront`, `apps/dashboard`: **empty placeholders**. Each has a `package.json` (`@smartapp/storefront`, `@smartapp/dashboard`), a `tsconfig.json` and an empty `src/` with a `.gitkeep`. No Next.js, no Vite, no React yet.
  - `packages/ui`, `packages/core`, `packages/api`: names `@smartapp/ui`, `@smartapp/core`, `@smartapp/api`. Only `core` gets real code in this checkpoint; `ui` and `api` get `package.json`, `tsconfig.json`, `src/index.ts` exporting nothing.
  - `supabase/` with `migrations/.gitkeep` and `functions/.gitkeep`. No migrations, no `supabase init` yet.
  - `docs/`, `docs/prompts/`, `reference/`.
- Shared `tsconfig.base.json`: strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- Root scripts: `pnpm check` = `turbo run typecheck lint test`. Every workspace package has `typecheck`, `lint` and `test` scripts (an empty package may use `vitest run --passWithNoTests`).
- `.gitignore` covers `node_modules`, `.turbo`, `dist`, `.env*` except `.env.example`.
- Branches: `main` (releases) and `dev` (work) already exist. Commit on `dev`.

**Tooling installed in this checkpoint, and nothing else:** `turbo`, `typescript@6.0.3`, `zod@4` (latest 4.x patch), `eslint@10` with flat config, `typescript-eslint`, `vitest`. Pin exact versions (no `^`). Check the current patch with `npm view <pkg> version` and record each one in `docs/stack-versions.md`. Next.js, Vite, React, Tailwind, shadcn, TanStack and Supabase are Phase 2, not now.

### 2. Context files

- `CLAUDE.md` (under 120 lines):
  - one paragraph on what the MVP is, pointing to `docs/system-paper.md` section 4 for scope
  - the folder map and the "you are writing → it goes in" table from paper 8.3
  - the commands (`pnpm install`, `pnpm check`, `pnpm --filter <pkg> …`)
  - the rules, word for word from the Build Plan "CLAUDE.md rules (short version)", plus: apps never import each other; only `packages/api` imports `@supabase/*`; `packages/core` has no React and no Supabase; dashboard features never import each other; never edit an applied migration; `reference/` is read-only and never imported.
  - "If this file and docs/system-paper.md disagree, the paper wins. New ideas go to docs/system-paper.md section 11, not into the current checkpoint."
- `docs/system-paper.md`: the full System Paper v1.1 converted to clean Markdown (headings, tables, code blocks for the flows and wireframes). Same content, nothing added, nothing dropped.
- `docs/build-plan.md`: the full Build Plan v1.1 converted the same way.
- `docs/decisions.md`: one line per decision. D1 to D11 from paper section 15, then the 8 "Before phase 1" decisions from the Build Plan, then these P1 decisions:
  - Package scope is `@smartapp/*`.
  - Enum values (below) are the only allowed values; the database CHECK constraints will mirror them.
  - Database function names follow paper 7.4 exactly (`create_my_shop`, `get_order`, `shop_settings`…).
- `docs/stack-versions.md`: the full target stack from paper 8.2 with exact versions, marking which are installed now (P1) and which come in Phase 2. Security notes: Next.js never below 16.3.8; `proxy.ts` not middleware; `getClaims()` on the server, never trust a cookie session alone; publishable key only in apps, secret key only in scripts and Edge Functions.
- `docs/prompts/`: this prompt is already there; leave it.

### 3. Contracts in `packages/core`

Zod 4 schemas, types from `z.infer`, one file per shape under `packages/core/src/schemas/`, re-exported from `src/index.ts`. Fields and names follow paper section 7.3. Use camelCase in TypeScript; the mapping to snake_case columns happens later in `packages/api`.

- **Primitives** (`primitives.ts`): `Centavos` (non-negative integer), `Uuid`, `Slug` (lowercase, digits, hyphens, 3 to 40 chars), `PhPhone` (`+639` + 9 digits), `IsoDateTime`, `ManilaDate` (`YYYY-MM-DD`).
- **Enums** (`enums.ts`), as `z.enum` and exported value lists:
  - `BusinessType`: `food`, `retail`
  - `ShopStatus`: `pending`, `active`, `suspended`
  - `Fulfillment`: `walk_in`, `pickup`, `delivery`
  - `OrderStatus`: `placed`, `preparing`, `ready`, `out_for_delivery`, `completed`, `cancelled`, `expired`
  - `PaymentStatus`: `unpaid`, `pending`, `paid`
  - `PaymentMethod`: `cash`, `cod`, `gcash`, `maya`, `bank`
  - `PaymentReviewStatus`: `pending`, `confirmed`, `rejected`
  - `ItemStatus`: `active`, `hidden`, `archived`
  - `LoyaltyReason`: `earned`, `redeemed`, `reversed`, `manual`
  - `MemberRole`: `owner` (later roles are added as new values, not now)
- **Shapes**: `Shop` (tenant + public shop settings), `Item`, `Variant`, `OptionGroup` + `Option`, `CartLine`, `OrderPayload` (what the storefront sends to `quote_order` and `place_order`, including `clientKey`; no prices, the database computes them), `Order`, `OrderLine`, `Payment`, `Customer`, `StampRule`.
- **Database function contracts** (`src/contracts/db-functions.ts`): one entry per function in paper 7.4, each with a Zod `input` and `output` schema and a one-line comment on who calls it. A type `DbFunctionName` is the union of the keys. These are contracts only, no implementation.
- **Tests** (`*.test.ts` next to each file): a valid sample parses for every shape; money rejects decimals and negatives; phone rejects `09…` format; an `OrderPayload` with a price field is rejected (strict object).

Copy-and-trim from the old repo's `packages/core` schemas where they match paper 7.3. Where the old repo and the paper differ, the paper wins.

### 4. Reference code (not compiled)

Clone the old repo `webserbisyo/Smart-App-PH` (read-only; in a cloud session, attach it to the session first) to a temporary folder outside this repo and copy **only these files** into `reference/`, keeping their old paths as subfolders:

- `tokens.css`
- money and time helpers
- order rules (`nextActions`, `splitOpenOrders`)
- image compression / upload queue
- order engine SQL (`build_order`, `place_order`, `submit_payment_proof`, `review_payment`, `advance_order`)
- dashboard shell and module registry

Add `reference/README.md`: one line per file saying what it is and which checkpoint will use it. `reference/` is excluded from TypeScript, ESLint, Vitest and Turbo. Never copy whole folders. If the old repo can't be reached, skip this step, say so in the final reply, and leave only the README with the list.

### 5. Import rules in ESLint

Root `eslint.config.js` (flat config, `typescript-eslint` strict type-checked) enforcing, with `no-restricted-imports` and file-scoped config blocks (no extra boundary plugin):

- `@supabase/*` may be imported only inside `packages/api`.
- `apps/storefront` may not import from `apps/dashboard`, and the reverse.
- `packages/core` may not import `react`, `react-dom`, `@supabase/*`, `@smartapp/ui` or `@smartapp/api`.
- `packages/ui` may not import `@supabase/*` or `@smartapp/api`.
- `apps/dashboard/src/features/<a>/**` may not import from `apps/dashboard/src/features/<b>/**` (relative or aliased).
- `@typescript-eslint/no-explicit-any`, `no-unsafe-*`, `ban-ts-comment` (no `@ts-ignore`, no `@ts-expect-error`), and `consistent-type-assertions` set to `never` (allow `as const`) as errors.

Prove each rule: add `tooling/lint-fixtures/` with one tiny file per rule that breaks it, and a Vitest test (`tooling/lint-rules.test.ts`) that runs ESLint's Node API on each fixture and expects the named rule to fire. The fixtures are excluded from normal lint so `pnpm check` stays green.

## Do not build

- No Next.js, Vite, React, Tailwind, shadcn, TanStack or Supabase packages (Phase 2).
- No Supabase project, CLI link, migrations or `.env` files (Phase 2 and 3).
- No screens, layouts, tokens in `packages/ui`, or helpers in `packages/core` beyond the schemas (money and time helpers come with the checkpoint that uses them).
- No Vercel or Resend setup.
- Nothing from the Master Blueprint that v1.1 does not list: no `packages/data`, `packages/i18n`, `packages/commerce-ui`, no `docs/ai/` folder, no dine-in or shipping enums, no `/admin` screen.

## Rules

- `pnpm check` green before you finish.
- No packages beyond the tooling list above without asking.
- No `any`, no type casts, no `@ts-ignore`.
- Never read or print `.env.local`.

## Done when (I will check)

- `git branch -a` shows `main` and `dev`; the folder tree matches paper 8.3.
- `pnpm install && pnpm check` is green from a fresh clone.
- `packages/core` exports every shape and every database function contract listed above, and their tests pass.
- Putting `import { createClient } from '@supabase/supabase-js'` into `packages/core/src/index.ts` makes `pnpm check` fail (then remove it).
- A new Claude Code session, given only "Read CLAUDE.md. What is in the MVP, and where would you put a new stamp-progress rule and its data hook?", answers: walk-in/pickup/delivery ordering + manual payment check + members and stamps; rule in `packages/core`, hook in `packages/api`.

## Finish

Commit `chore(p1): monorepo, context files, core contracts, import rules`, push `dev` (if the session may only push its own `claude/…` branch, push that and say so; I will merge it into `dev`), then reply in 5 lines: what changed, the installed versions, whether reference code was copied, anything you had to decide, and how I test it.
