# Checkpoint P3a: First migration (shops, owners, RLS) with database tests

Build Plan v1.1, Phase 3, checkpoint 3.1. System paper 5, 6.1, 7.1 to 7.4, 10, Appendix A.

Runs after P2. Does not need the domain or email.

To run it, paste this one line into a Claude Code session on `webserbisyo/Smart-App-PH-MVP`:

> Read docs/prompts/P3a-shops-database-and-rls.md and do exactly that checkpoint.

---

## Goal

The first migration creates shops, owners and settings with row-level security that the database itself enforces, proven by tests that sign in as two different owners, and it reaches the hosted project only through the `db-deploy` workflow.

## Read first

`CLAUDE.md`, system paper 7.1 to 7.4, 10 and Appendix A, `packages/core/src/schemas/shop.ts`, `tenant-member.ts`, `primitives.ts` and `packages/core/src/contracts/db-functions.ts`. Start with a short plan that lists every file, then build.

## Build only

### 1. Migration `supabase/migrations/<timestamp>_shops_and_owners.sql`

One file. Tables, constraints, RLS, grants, policies and functions together. Columns and names exactly as paper 7.3 and the Zod contracts (snake_case in SQL).

- **Lock down first.** `revoke all` on every new table from `anon` and `authenticated`, then grant back only what is listed here. Enable RLS on every table. A `private` schema (not exposed by the API) holds helper functions.
- **`tenants`**: `id uuid pk default gen_random_uuid()`, `slug text unique not null`, `name text not null` (1 to 80 chars), `business_type` check `('food','retail')`, `status` default `'pending'` check `('pending','active','suspended')`, `plan text`, `paid_until date`, `is_demo boolean default false`, `created_at timestamptz default now()`.
  - Slug check: same pattern as `Slug` in `packages/core` (3 to 40 chars, lowercase, digits, single hyphens) and not a reserved word (`private.is_reserved_slug(text)`, immutable).
  - Reserved words, mirrored in `packages/core/src/schemas/primitives.ts` as `RESERVED_SLUGS` and checked by the `Slug` schema: `app api admin www mail auth login signup account orders cart checkout menu o i s static assets _next manifest sw favicon robots sitemap privacy terms about pricing help support status dashboard demo`. The storefront lives at `shop.webserbisyo.com/<slug>`, so these would collide with routes, and later with per-shop subdomains.
- **`profiles`**: `id uuid pk references auth.users on delete cascade`, `display_name text`, `phone text`, `created_at`. Filled by an `after insert on auth.users` trigger (`security definer`, `set search_path = ''`) that copies `raw_user_meta_data->>'display_name'`.
- **`tenant_members`**: `tenant_id`, `user_id` (references `auth.users`), `role` check `('owner')`, `status` default `'active'` check `('active','removed')`, `created_at`, primary key `(tenant_id, user_id)`, index on `user_id`.
- **`shop_settings`**: one row per tenant (`tenant_id` pk references `tenants on delete cascade`), every column in paper 7.3 with these defaults: colours `#FFFFFF` / `#F4F7FA` / `#2456D3`, `accepting_orders true`, `walk_in_enabled true`, `pickup_enabled true`, `delivery_enabled false`, `cod_enabled false`, `pay_later_pickup false`, `delivery_fee_via_messenger false`, `unpaid_expiry_minutes 30` (check > 0), `show_member_count true`. Colour columns check `^#[0-9A-Fa-f]{6}$`.
- **Helpers** in `private`, `security definer`, `stable`, `set search_path = ''`, using `(select auth.uid())`:
  - `private.is_shop_member(tenant uuid)`: an active `tenant_members` row for the caller.
  - `private.is_active_shop_owner(tenant uuid)`: the same, and the tenant's status is `active`.
- **Grants and policies** (`authenticated` only; `anon` gets nothing in this migration):
  - `tenants`: select where `is_shop_member(id)`. Column grant `update (name)` only, policy `is_active_shop_owner(id)`. Owners can never change `slug`, `status`, `plan`, `paid_until` or `is_demo`; those change only by founder SQL.
  - `tenant_members`: select own rows (`user_id = (select auth.uid())`). No client writes.
  - `shop_settings`: select where `is_shop_member(tenant_id)`; column grant `update` on every column except `tenant_id`, policy `is_active_shop_owner(tenant_id)`. No insert or delete.
  - `profiles`: select and `update (display_name, phone)` own row only.
- **`create_my_shop(p_business_type text, p_name text, p_slug text) returns tenants`**: `security definer`, `set search_path = ''`. Requires a signed-in caller; raises `already_has_shop` if the caller already has an active membership (one shop per owner at launch, enforced here, not by a constraint, so multi-shop can come later); validates name and slug (`slug_invalid`, `slug_reserved`); inserts the tenant as `pending`, the owner membership and the settings row; turns a unique violation into `slug_taken`. Errors use `raise exception '<code>'` with a fixed code list that the dashboard maps to words.
  - Default business hours are **not** created here: `business_hours` arrives in P5.1, whose migration replaces this function to add them. Update the comment on `create_my_shop` in `db-functions.ts` to say so.
- **`slug_available(p_slug text) returns boolean`**: for the live check on the setup screen; `security definer`, `stable`, false for invalid or reserved slugs. Add its contract to `db-functions.ts` and a line to `docs/decisions.md`.
- Function grants: `revoke execute ... from public, anon`; `grant execute ... to authenticated` for `create_my_shop` and `slug_available` only.

Copy RLS and function style from the reference migrations in `reference/supabase/migrations/` where it fits; the paper's names win.

### 2. Database tests (pgTAP)

`supabase/tests/database/01_shops_and_owners.test.sql`, run with `supabase test db`. Each test creates two users in `auth.users`, switches with `set local role authenticated` and `set local request.jwt.claims`, and covers:

1. Sign-up creates a `profiles` row.
2. `create_my_shop` creates a pending tenant, an owner membership and a settings row with the defaults.
3. A second `create_my_shop` by the same user raises `already_has_shop`.
4. Taken, reserved and badly formed slugs raise `slug_taken`, `slug_reserved`, `slug_invalid`; `slug_available` agrees.
5. Owner A sees only shop A in `tenants`, `shop_settings` and `tenant_members`; selecting shop B's rows by id returns nothing.
6. Owner A cannot update shop B's name or settings (0 rows).
7. Owner A cannot update their own `status`, `paid_until`, `plan`, `slug` or `is_demo` (permission denied).
8. While shop A is pending, A cannot update its settings; after the founder approve SQL (Appendix A, run as `postgres`), A can.
9. A cannot insert into `tenant_members` or `tenants` directly.
10. `anon` cannot select any of the four tables or call either function.

Add `"db:test": "supabase test db"` and `"db:types"` (generates `packages/api/src/database.types.ts` from the local stack) to the root `package.json`.

Run them yourself if Docker works in your session (`supabase start`, `pnpm db:test`, `pnpm db:types`). If Docker does not work, say so and rely on CI.

### 3. CI

Add a `db` job to `.github/workflows/check.yml`: `supabase/setup-cli` (pinned), `supabase start` (only the database services it needs), `supabase test db`, then regenerate types and fail if `packages/api/src/database.types.ts` differs from the committed file.

### 4. Founder SQL snippets

`supabase/snippets/founder.sql`: the Appendix A queries, unchanged, as the copy-paste source for the saved snippets in the Supabase SQL editor.

## Do not build

- No screens, auth calls, Supabase client code or hooks (P3b).
- No `customers`, catalog, order or loyalty tables (P5), no storage buckets (P5.1), no `business_hours` (P5.1).
- No staff roles beyond `owner`, no admin screen, no subscription billing table.
- Do not apply the migration with the Supabase connector or `db push` from your session. It reaches the hosted project only through the `db-deploy` workflow when it lands on `dev`.

## Rules

- `pnpm check` green, `pnpm db:test` green (locally or in CI).
- No new npm packages. Never edit a migration after it is applied.
- RLS, grants and policies in the same file as the table.

## Done when (I will check)

- The `check` workflow is green including the `db` job, with all ten database tests passing.
- After merge to `dev`, the `db-deploy` workflow is green and the Supabase Table Editor shows the four tables with RLS on.
- Supabase → Advisors → Security shows no errors for these tables.
- In the SQL editor, the "Shops waiting for approval" snippet runs (empty result).

## Finish

Commit `feat(p3a): shops, owners and settings with RLS and database tests`, push `dev` (or your `claude/…` branch and say so), then reply in 5 lines: what changed, test results, whether Docker worked, anything you had to decide, and what I check.
