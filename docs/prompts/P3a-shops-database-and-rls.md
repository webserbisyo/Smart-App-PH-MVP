# Checkpoint P3a: First migration (shops, owners, RLS) with database tests

Build Plan v1.1, Phase 3, checkpoint 3.1. System paper 5, 6.1, 7.1 to 7.4, 10, Appendix A.
Revised 2026-10-11 after reviewing what P1, P2 and P2.6 built. Runs after P2.6. No screens.

To run it, paste this one line into a Claude Code session on `webserbisyo/Smart-App-PH-MVP`:

> Read docs/prompts/P3a-shops-database-and-rls.md and do exactly that checkpoint.

---

## Goal

The first migration creates shops, owners and settings with row-level security that the database itself
enforces, proven by pgTAP tests that act as two different owners and as an anonymous visitor. It reaches the
hosted project only through the `db-deploy` workflow.

## Read first

`CLAUDE.md`, system paper 7.1 to 7.4, 10 and Appendix A, `packages/core/src/schemas/shop.ts`, `tenant-member.ts`,
`primitives.ts`, `packages/core/src/contracts/db-functions.ts`, `supabase/config.toml`,
`.github/workflows/check.yml` and `db-deploy.yml`, and the style of `reference/supabase/migrations/`.
Start with a short plan that lists every file, then build.

## Build only

### 1. Migration `supabase/migrations/<timestamp>_shops_and_owners.sql`

One file: schema, tables, constraints, RLS, grants, policies and functions together. Names exactly as paper 7.3
(snake_case in SQL; the Zod contracts are the camelCase mirror).

**Lock down first (this protects every later migration too).**
- `create schema if not exists private;` revoke all on it from `public, anon, authenticated`. Helpers live here.
  It is not in `[api] schemas`, so the Data API cannot reach it.
- Default privileges for the role that runs migrations (`postgres`), so a table or function a later migration
  forgets to lock is closed, not open:
  `alter default privileges in schema public revoke all on tables from anon, authenticated;`
  `alter default privileges in schema public revoke execute on functions from public, anon, authenticated;`
  (same for sequences). `service_role` keeps its defaults.
- Every grant below is explicit. Never rely on Supabase's default exposure (`auto_expose_new_tables`).
- RLS enabled on every table in this file.

**`private.try_uuid(text) returns uuid`**: immutable, returns null instead of raising on bad input. Storage and
realtime policies in later checkpoints use it to read ids out of paths and topics.

**`tenants`**: `id uuid pk default gen_random_uuid()`, `slug text not null unique`, `name text not null`
(trimmed length 1 to 80), `business_type text not null` check `('food','retail')`, `status text not null default
'pending'` check `('pending','active','suspended')`, `plan text`, `paid_until date`, `is_demo boolean not null default
false`, `created_at timestamptz not null default now()`.
- Slug check: `^[a-z0-9]+(-[a-z0-9]+)*$`, 3 to 40 chars, and `not private.is_reserved_slug(slug)` (immutable).
- Reserved words, mirrored in `packages/core/src/schemas/primitives.ts` as `RESERVED_SLUGS` and refused by the
  `Slug` schema with its own message: `app api admin www mail auth login signup account orders cart checkout menu o i s
  static assets _next manifest sw favicon robots sitemap privacy terms about pricing help support status dashboard demo
  shop shops`. Storefront routes live at `shop.webserbisyo.com/<slug>`, and per-shop subdomains come later.

**`profiles`**: `id uuid pk references auth.users on delete cascade`, `display_name text` (max 80), `phone text`
(check `^\+639\d{9}$` when not null), `created_at`. Filled by `private.handle_new_user()` (`security definer`,
`set search_path = ''`) on `after insert on auth.users`, copying `raw_user_meta_data->>'display_name'` (trimmed,
cut to 80, null when empty). Storefront customers sign up with no metadata, so null must work.

**`tenant_members`**: `tenant_id uuid references tenants on delete cascade`, `user_id uuid references auth.users on
delete cascade`, `role text not null default 'owner'` check `('owner')`, `status text not null default 'active'` check
`('active','removed')`, `created_at`, primary key `(tenant_id, user_id)`, index on `user_id`.

**`shop_settings`**: `tenant_id uuid pk references tenants on delete cascade`, every column in paper 7.3 / the
`ShopSettings` schema. Defaults: colours `#FFFFFF` / `#F4F7FA` / `#2456D3`, `accepting_orders true`, `walk_in_enabled
true`, `pickup_enabled true`, `delivery_enabled false`, `cod_enabled false`, `pay_later_pickup false`,
`delivery_fee_via_messenger false`, `unpaid_expiry_minutes 30` (check 5 to 1440), `show_member_count true`.
Checks: colours `^#[0-9A-Fa-f]{6}$`; `tagline` max 160; `messenger_username` `^[A-Za-z0-9.]{1,50}$` when not null
(it becomes `m.me/<username>`); `maps_url` and `facebook_url` start with `https://` when not null.

**Helpers** in `private`, `security definer`, `stable`, `set search_path = ''`, using `(select auth.uid())`:
- `private.is_shop_member(p_tenant uuid)`: an active `tenant_members` row for the caller.
- `private.is_active_shop_owner(p_tenant uuid)`: the same, role `owner`, and the tenant's status is `active`.
- `grant usage on schema private to authenticated` and `grant execute` on these two (RLS policies run as the
  caller). Nothing else in `private` is executable by clients.

**Grants and policies** (`authenticated` only; `anon` gets nothing in this migration):
- `tenants`: `select` where `private.is_shop_member(id)`. Column grant `update (name)` only, policy
  `private.is_active_shop_owner(id)`. Owners never change `slug`, `status`, `plan`, `paid_until` or `is_demo`;
  those change only by founder SQL (Appendix A).
- `tenant_members`: `select` own rows (`user_id = (select auth.uid())`). No client writes.
- `shop_settings`: `select` where `private.is_shop_member(tenant_id)`; column grant `update` on every column except
  `tenant_id`, policy `private.is_active_shop_owner(tenant_id)`. No insert or delete.
- `profiles`: `select` and `update (display_name, phone)` own row only.

**`public.create_my_shop(p_business_type text, p_name text, p_slug text) returns public.tenants`**:
`security definer`, `set search_path = ''`.
- Requires a signed-in caller (`not_signed_in`).
- `already_has_shop` if the caller has any active membership (one shop per owner at launch, enforced here and not
  by a constraint, so multi-shop can come later).
- Validates: `invalid` for a bad business type or name, `slug_invalid`, `slug_reserved`.
- Inserts the tenant (`pending`), the owner membership and the settings row; a unique violation on the slug
  becomes `slug_taken`.
- Errors are `raise exception '<code>'` from a fixed list; the apps map codes to words.
- Default business hours are **not** created here: `business_hours` arrives in P5.1, whose migration replaces this
  function. Update the comment on `create_my_shop` in `db-functions.ts` to say so.

**`public.slug_available(p_slug text) returns boolean`**: `security definer`, `stable`; false for invalid,
reserved or taken slugs. Add its contract to `db-functions.ts`.

**Function grants**: `revoke execute ... from public, anon` on every function; `grant execute ... to
authenticated` for `create_my_shop` and `slug_available` only.

### 2. Database tests (pgTAP)

`supabase/tests/database/01_shops_and_owners.test.sql`, run with `supabase test db`. Start the file with
`create extension if not exists pgtap with schema extensions;`, wrap it in `begin; ... rollback;`, and keep the
helpers at the top of the file (no test-helper packages):
- `tests_create_user(email)` inserts into `auth.users` and returns the id.
- `tests_act_as(user_id)` does `set local role authenticated` and
  `select set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true)`.
- `tests_act_as_anon()` and `reset role` for founder steps (run as `postgres`).

Cover, each as its own assertion:
1. A new `auth.users` row creates a `profiles` row; a user with no metadata gets `display_name` null.
2. `create_my_shop` creates a pending tenant, an owner membership and a settings row with the defaults.
3. A second `create_my_shop` by the same user raises `already_has_shop`.
4. Taken, reserved and badly formed slugs raise `slug_taken`, `slug_reserved`, `slug_invalid`; `slug_available` agrees.
5. Owner A sees only shop A in `tenants`, `shop_settings` and `tenant_members`; selecting shop B's rows by id returns nothing.
6. Owner A cannot update shop B's name or settings (0 rows changed).
7. Owner A cannot update their own `status`, `paid_until`, `plan`, `slug` or `is_demo` (permission denied).
8. While shop A is pending, A cannot update its settings; after the approve SQL from Appendix A (as `postgres`), A can.
9. A cannot insert into `tenant_members` or `tenants` directly.
10. `anon` cannot select any of the four tables or call either function.
11. `private.is_reserved_slug` and the core `RESERVED_SLUGS` list agree: a Vitest test in `packages/core` reads
    the migration file and checks that every word in `RESERVED_SLUGS` appears in it (and only those).
12. A new table created in a test (as `postgres`) after the migration is not selectable by `authenticated`
    (proves the default-privileges lock).

Root `package.json` scripts: `"db:start": "supabase db start"`, `"db:test": "supabase test db"`,
`"db:types": "supabase gen types typescript --local --schema public > packages/api/src/database.types.ts"`.
Commit the generated `database.types.ts` (lint and typecheck must accept it; exclude it from lint rules only if
a rule cannot pass on generated code, and say which).

Add an empty `supabase/seed.sql` with one comment line (config.toml already points at it; P5.2 fills it).

Run the tests yourself if Docker works in your session (`pnpm db:start`, `pnpm db:test`, `pnpm db:types`). If
Docker does not work, say so and rely on CI.

### 3. CI

Add a `db` job to `.github/workflows/check.yml`: `supabase/setup-cli@v1` with `version: 2.120.0` (same as the root
devDependency and `db-deploy`), `supabase db start` (database only; faster than `supabase start`),
`supabase test db`, then regenerate types and fail if `packages/api/src/database.types.ts` differs from the commit.

### 4. Founder SQL snippets

`supabase/snippets/founder.sql`: the Appendix A queries, unchanged, as the copy-paste source for saved snippets in
the Supabase SQL editor.

### 5. Docs

`docs/decisions.md`, new section "## Phase 3":
- P3-1: Default privileges revoke table and function access from `anon` and `authenticated` in `public`; every
  grant is explicit.
- P3-2: Owners change only the shop name and settings, and only while active; slug, status, plan, paid_until and
  is_demo change only by founder SQL.
- P3-3: `create_my_shop` adds default hours from P5.1, when `business_hours` exists.
- P3-4: `slug_available` and `private.try_uuid` were added beyond paper 7.4.

## Do not build

- No screens, auth calls, Supabase client code or hooks (P3b).
- No customers, catalog, order or loyalty tables, no storage buckets, no `business_hours` (P5).
- No staff roles beyond `owner`, no admin screen, no subscription billing table.
- Do not apply the migration with the Supabase connector or `db push` from your session. It reaches the hosted
  project only through `db-deploy` when it lands on `dev`.

## Rules

- `pnpm check` green, `pnpm db:test` green (locally or in CI).
- No new npm packages. Never edit a migration after it is applied.
- RLS, grants and policies in the same file as the table.

## Done when (I will check)

- The `check` workflow is green including the `db` job, with every database test passing.
- After the merge to `dev`, the `db-deploy` workflow is green.
- Supabase → Table Editor shows `tenants`, `profiles`, `tenant_members`, `shop_settings`, each with "RLS enabled".
- Supabase → Advisors → Security Advisor shows no errors for these tables and functions.
- In the SQL editor, the "Shops waiting for approval" snippet runs (empty result).

## Finish

Commit `feat(p3a): shops, owners and settings with RLS and database tests` on your `claude/…` branch, push, open
a pull request into `dev`, then reply in 5 lines: what changed, test results, whether Docker worked, anything you
decided, and what I check.
