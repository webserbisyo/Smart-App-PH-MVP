# Smart App PH: Full Product on NestJS (Blueprint B)

Version 3.0 · 2026-10-14 (Asia/Manila) · Founder: Juan Miguel Morales (GitHub: webserbisyo) · Prepared by Claude

This is the corrected successor to **Master Blueprint 2.0** (2026-10-12). It keeps that document's product decisions (its sections 1, 4 to 8 and 11 to 14), fixes its errors, and replaces its architecture with a NestJS backend on Railway. The live MVP and Blueprint A are never changed by anything in this document.

**Founder decisions this blueprint follows (locked):** the full product is rebuilt with a NestJS backend on Railway; it re-applies and improves what the original Smart App PH built and planned; it is built on new branches in parallel; Claude writes one prompt at a time and Google Antigravity codes, one module or page per prompt.

**How to read it:** sections 1 to 8 are the product (what). Section 9 is the architecture (how). Section 10 is the migration path. Sections 11 and 12 are the inventory and the build order. Sections 15 to 18 are risks, timing and questions.

---

## 0. What was wrong in Master Blueprint 2.0 (fixed here)

| # | Master Blueprint 2.0 says | Truth (checked in the repos) |
| --- | --- | --- |
| E1 | "founder: Alex" (header). Also in `docs/system-paper.md` ("Prepared for: Alex") | The founder is **Juan Miguel Morales** |
| E2 | Old names: `tenant_settings`, `create_my_tenant`, `get_public_tenant`, `packages/data`, `modules/`, i18n `t()` | Live names win (section 3): `shop_settings`, `create_my_shop`, `get_storefront`, `packages/api`, `features/`, `words.ts` |
| E3 | Section 3.1 MVP includes `/admin` approvals, dine-in, shipping, Turnstile | Live MVP: no admin screen (D2, approval by SQL), walk-in, pickup and delivery only (B4), Turnstile moved (P5-6) |
| E4 | Pricing ₱999 setup plus ₱799 per month | Live decision D9: ₱599 per month. Still open (question Q1) |
| E5 | Raised centre "Sell" button in the phone dock | Live decision UI-2: no raised button **at launch**, because POS was not in the MVP. It can return with POS (question Q7) |
| E6 | Statuses `in_prep`, `out`; payment `refunded`; `payments.kind`; `order_item_options` table; `scheduled_for` | Live: `preparing`, `out_for_delivery`; payment `unpaid`, `pending`, `paid`; no `kind`; options stored as `jsonb` on `order_items`; `pickup_at` |
| E7 | Section 10 versions: pnpm 12.8.1, next 16.3.8, vite 8.3.2 | Repo: pnpm 10.28.0, next 16.4.0, vite 8.3.4, zod 4.6.6, supabase CLI 2.120.0, turbo 2.11.7, TypeScript 6.0.3 |
| E8 | Section 13: "Claude Code does the database, Antigravity does UI" | New workflow: Claude writes prompts and reviews; Antigravity codes everything, database included, with Claude's review and CI tests as the gate |
| E9 | Section 15 "truth": demo data by `scripts/seed-demo.ts` with tags | Live: demo data in SQL, `private.demo_reset` and `seed.sql` (D7, P5-13). Section 15's correction is itself out of date |
| E10 | Section 15 "truth": `close_stale_orders` with reason `left_open` | True for the old repo only. The live MVP has no `close_stale_orders`; it comes back in the Orders module |
| E11 | Section 14: "a member = `customers.user_id` set" | Live D5: a member is a customer with `member_since` set (a linked login). Same idea, different column to test |
| E12 | Section 14: daily summaries rebuilt by cron at 02:05 | Not in the live MVP; reports compute from orders. Daily summaries return only with full reports, if speed needs them |
| E13 | Section 13 workflow: commit and push to `dev` | Agents never push to `dev`, `main` or `next`; every change is a PR (Blueprint A section 7) |
| E14 | One Supabase project for everything | Three projects: production, staging, next (section 9.16) |
| E15 | Section 3.3 calls the MVP database "new Supabase project" with 44 tables | The live MVP has 26 tables. The other 18 come back through this blueprint |

---

## 1. The product in one page

Smart App PH gives every small Philippine business an installable **storefront app** (PWA) for its customers and a **dashboard** for the owner and staff: POS, orders, kitchen or packing, catalog, stock, staff, shifts, promotions, stamps, members and reports.

Pitch: **"May app ka na, may website ka pa."** No commission; money goes straight to the shop's own GCash, Maya or bank.

**Main selling point: members.** Every customer who joins the stamp card is someone the owner can reach again for free.

**Who it is for:** small PH businesses of any kind, from one engine. Never assume food.

| Business type (`tenants.business_type`) | For | Catalog word | Prep word | Default features |
| --- | --- | --- | --- | --- |
| `food` | cafes, milk tea, bakeries, restaurants, kiosks | Menu, Menu item | Kitchen | `pos`, `prep`, `tables` |
| `retail` | clothing, online sellers, homemade and bulk sellers | Products, Product | Packing, Packer | `pos`, `prep`, `shipping`, `preorder` |
| `services` (later) | salons, staycations | | | bookings module, later |

The business type only picks the starting switches. Code never says `if (business_type === 'food')`.

**Pricing:** to be confirmed (Q1). Live: ₱599 per month founding plan. Planned add-ons: staff seats, setup service, custom domain, extra storage, custom website.

**Subscription states** (system paper section 12, built in the Platform module): Active; Overdue days 1 to 7 (banner); Restricted days 8 to 30 (orders work, edits locked); Paused after day 30 (menu and Messenger button only).

**Running costs:** Vercel Pro (US$20) plus Supabase Pro (US$25) plus Railway (about US$5 to 15, section 9.18) plus the domain.

---

## 2. What already exists

| Codebase | Where | State |
| --- | --- | --- |
| Original Smart App PH | `webserbisyo/Smart-App-PH`, branch `redesign/v3-home` (`dff6bf9`, 2026-10-12); `main` is the older `db-v1` (`e679982`) | 37 migrations, 44 tables, about 110 public RPCs, dashboard modules catalog, customers, home, marketing, online-shop (placeholder), orders, prep, reports, sell, settings, staff; storefront `[slug]` routes incl. `/privacy`, `/cart`, `/i/[itemId]`; staff Edge Function `supabase/functions/staff` (241 lines); `packages/core/src/permissions.ts` and `roles.ts` |
| Live MVP | `webserbisyo/smart-app-ph-mvp`, branch `dev` (`b53a7e7`, PR #21, 2026-10-14) | 10 migrations, 26 tables, 19 public RPCs, launch features (Blueprint A section 2) |

The old repo is the **reference** for every module in this blueprint. Its SQL is ported into new migrations with live names; its screens are re-designed on the live UI kit. Nothing is copied blindly (its docs contain the errors in section 0).

---

## 3. Name map: old repo and Master Blueprint to live

Every prompt translates old names to live names. Live names win.

| Old / Master Blueprint | Live MVP | Note |
| --- | --- | --- |
| `tenant_settings` | `shop_settings` | |
| `tenants.preset` | `tenants.business_type` | |
| `create_my_tenant` | `create_my_shop` | |
| `get_public_tenant`, storefront reads | `get_storefront` | |
| `get_order_by_token`, `get_orders_by_tokens` | `get_order` | |
| `get_today_summary` | `get_dashboard_today` | |
| `get_my_shop_account` | `get_my_account` | |
| `is_slug_available` | `slug_available` | |
| `reorder_categories`, `reorder_items` | `save_sort_order` | |
| `set_stock_count`, `adjust_stock` | `set_stock` (MVP); B adds `adjust_stock` with reasons | |
| `get_sales_series`, `get_top_items` | `get_sales_report` | B adds the rest |
| statuses `in_prep`, `out` | `preparing`, `out_for_delivery` | |
| `scheduled_for` | `pickup_at` | B adds a due time for all types (M11) |
| `order_item_options` table | `order_items.options` jsonb | keep jsonb |
| `packages/data`, `packages/i18n` | `packages/api`, `packages/core/src/words.ts` | |
| `apps/dashboard/src/modules/<area>` | `apps/dashboard/src/features/<area>/{screens,components,hooks,module.ts}` | |
| storefront `/[slug]/catalog`, `/cart`, `/i/[itemId]` | `/[shop]/menu`, CartSheet, ItemSheet | |
| `customer_identities` | does not exist | member = `member_since` set |
| demo via `scripts/seed-demo.ts` | `private.demo_reset`, `seed.sql` | |
| `audit_log` with hash chain, many actions | `audit_log`, 5 actions, no chain (P5-29) | B restores the chain |

---

## 4. People, roles and permissions

| Person | Where | Login |
| --- | --- | --- |
| Customer | Storefront (browser or installed PWA) | Guest by default; member account with a 6-digit email code |
| Owner | Dashboard | Email and password (email confirmed by code); TOTP two-factor later |
| Staff (3 seats included) | Dashboard on a shared tablet or phone | Username plus shop code (hidden email `<username>.<slug>@<STAFF_EMAIL_DOMAIN>`), must change the password on first login |
| Platform admin | Dashboard `/admin` (Platform module) | The founder. Approves shops; opens a shop in support mode (read-only by default, 60 minutes, reason required, audited, visible to the owner, cannot create staff or reset passwords). Until then: SQL |

Roles: `owner`, `cashier`, `prep` (shown as Kitchen or Packer). Permissions are kept exactly as built in the old `packages/core/src/permissions.ts` and mirrored in a `role_permissions` table:

| Permission | Owner | Cashier | Prep |
| --- | --- | --- | --- |
| `home.view` | yes | | |
| `sell.use` (POS) | yes | yes | |
| `orders.view` | yes | yes | yes |
| `orders.manage` (pay, out, complete, cancel) | yes | yes | |
| `orders.void` | yes | with owner PIN | |
| `discount.apply` (voucher, senior/PWD) | yes | yes | |
| `discount.manual` | yes | with owner PIN | |
| `prep.view` | yes | | yes |
| `prep.update` (start, ready, recall) | yes | yes | yes |
| `stock.soldout` | yes | yes | yes |
| `shift.use` | yes | yes | |
| `shift.manage` | yes | | |
| `catalog.manage`, `customers.view`, `customers.manage`, `marketing.manage`, `reports.view`, `staff.manage`, `settings.manage`, `pin.manage` | yes | | |

Role homes: owner to Home, cashier to Sell, prep to Kitchen or Packing.

**Anti-fraud (never cut):** gap-free daily order numbers; nothing deleted (cancel and void keep a record with a reason); voids after payment and manual discounts need the owner's PIN; blind cash count at shift close; cash in and out needs a reason; reference numbers unique per shop and duplicate proof images flagged; price changes logged; stock changes need a reason; personal logins and auto-lock; append-only, hash-chained audit log; owner alerts.

---

## 5. Surfaces, pages and navigation

| Surface | Address | Tech | Users |
| --- | --- | --- | --- |
| Storefront PWA | `shop.webserbisyo.com/<slug>` (P2-5); later per-shop subdomain or custom domain | Next.js 16 App Router (`apps/storefront`) | Customers |
| Dashboard | `app.webserbisyo.com` | Vite, React, TanStack Router (`apps/dashboard`) | Owners, staff, admin |
| API | `api.webserbisyo.com` | NestJS on Railway (`apps/api`) | The two apps, webhooks |
| Marketing site | `webserbisyo.com` (untouched) | later | Business owners |

**Dashboard navigation** (desktop sidebar 248 px, collapsible 72 px rail; tablet rail; phone dock):
- Main: Home, Orders, Schedule (with `preorder`), Sell, Kitchen or Packing
- Shop: Menu or Products, Customers, Marketing, Reports, Staff
- Online: Online Shop, Settings
- Settings (the business): Business, Hours, Order types and tables, Payments, Messenger, Tax, Approval PIN, Store QR, Storage, Activity log, Reports and Sheet, This device, Demo data (demo shops only)
- Account (the person): Profile, Sign-in and security, Preferences, Help

Items only show when the role has the permission and the shop has the feature on.

**Storefront routes** (live names): `/[shop]` home, `/[shop]/menu`, item sheet, cart sheet, `/[shop]/checkout`, `/[shop]/o/[token]`, `/[shop]/orders`, `/[shop]/account`, `/[shop]/privacy` (Blueprint A), plus new: table ordering `/[shop]/t/[tableToken]`, rewards inside account, announcements on home.

---

## 6. Core flows

**F1. A new shop goes live.** Sign up with email and password (6-digit code), choose business type, name and address, first item, "Waiting for approval", the founder approves (SQL now, `/admin` later), Home with the setup guide, the first order arrives with a chime.

**F2. Walk-in sale (POS, cashier).** Sell, tap items, Charge, Cash (exact or quick amount, change due) or GCash/Maya (reference number), done (print slip or new sale). Target: 4 taps for 1 item paid in cash. The cashier must have an open shift.

**F3. Online order end to end.** Customer: link or QR, item sheet, cart, checkout. Types: walk-in, dine-in (table from QR, fixed), pickup (ASAP or a slot), delivery (address, landmark, zone fee), shipping (region rate). Pay: at counter, COD (if allowed), GCash, Maya or bank with proof and reference. Staff: "To verify", check the reference **in their own wallet app** (a screenshot never marks an order paid), Approve or Reject, Start, Ready, Out with a tracking link (delivery, shipping), Complete. Customer: live status page; stamps on completion; "Save your stamps, join" after the order, never before.

**F4. Kitchen loop.** New ticket chimes (oldest first), Start, strike lines, Ready (Recall if needed); all-day counts; sold-out switch updates the shop.

**F5. Member journey.** Guest order, join nudge, email code, member (`member_since` set), one welcome stamp, one stamp per completed paid order over the minimum, reward ready, redeemed at checkout. The owner sees members on Home and exports the promo list (consented contacts only).

**F6. Advance order (Schedule).** Owner turns on advance orders and marks items "can be ordered ahead" with lead days; customer picks a date and time inside hours and lead days; the order shows in Coming up and Orders, Schedule (calendar, "to make" list, deposit bar "₱600 of ₱1,200 paid"); it stays off the live board until its day and is never late before its due time.

**F7. Close shift.** Close, blind count, result (balanced, short, over), print the report; owner alerted above the threshold.

**F8. Old orders clean-up.** Orders left open on earlier days show as "N old orders to clean up". Clean-up completes the paid ones and cancels the unpaid ones with the reason `left_open`; advance orders not yet due are skipped.

**F9. Staff.** Staff, Add, role, generated password to copy; the staff member signs in with the shop code and must change the password. Turning off or removing keeps their name on history.

---

## 7. Features by area

Kept from Master Blueprint section 7, with the module that owns each (section 9.7).

| Area | What it does | Module |
| --- | --- | --- |
| Home (owner) | Greeting, to-do chips (late, to verify, old to clean up, low stock), shortcut tiles, 4 KPI cards, Members card (count, sign-ups chart, share of sales, came back, promo reach, close to reward, top suki), sales by hour, payment mix donut, In progress and Coming up, best sellers. In progress rows always use `nextActions()` | Reports, Orders |
| Cashier home | Waiting to pay, Cash in/out, Close shift | Shifts |
| Sell (POS) | Photo grid, categories, search (barcode later), variants and add-ons, cart, senior/PWD (ID and name), voucher, Charge (cash with quick amounts, GCash/Maya with reference), print slip "ORDER SLIP · NOT AN OFFICIAL RECEIPT", shift gate, lock screen | POS |
| Orders | Board (New, Preparing or Packing, Ready, Out, Done today), realtime with chime and 15 s polling fallback; detail with timeline, proof viewer with duplicate warning, mark paid, cancel with reason code, void (PIN), tracking link, print; history with filters | Orders |
| Schedule | Month calendar with counts, week strip on phone, Today, Tomorrow, This week, "to make" list, deposit bars | Schedule |
| Kitchen / Packing | Tap-first tickets, dark by default, Start, Ready, Recall, line strike-through, all-day counts, sold-out panel; 56 px touch targets | Prep |
| Catalog | Items (grid or table, bulk actions), categories, add-on groups, inventory with movements and reasons; editor with photos, variants (price, SKU, barcode, stock, low stock, cost hidden from staff), option types, min qty and step, price tiers, preorder lead days | Catalog, Inventory |
| Customers and members | List (members, all, guests, tags), detail (orders, stamps, consents), notes, block, COD allowed, anonymize (Data Privacy Act), "close to a reward" filter | Customers, Members |
| Marketing | Promotions (percent, peso, free item, free delivery; min spend; items or categories; first order; audience everyone, members or app installs; code or automatic; limits), stamp card rule, announcements (banner, push later) | Marketing |
| Staff | Up to 3 seats, roles explained, generated password, reset, turn off, remove (history kept), avatars | Staff |
| Reports | Overview, sales series, top items, payment mix, categories, staff, discounts, CSV; Google Sheet sync later | Reports |
| Settings | Business profile, hours and closures, order types, tables and table QR, delivery zones (flat, distance, region), payment accounts with QR, Messenger (off, button, required), tax (VAT switch, manual discount cap), approval PIN, store QR, storage manager (500 MB meter, delete unused, proofs older than 30 days), activity log, this device | Shops, Storage |
| Online Shop | Placeholder now; later brand, home sections, web address, app identity, go-live checks; 8 Filipino themes, default `uling` | Online Shop (late) |
| Storefront | Home with announcement, banners, order again, categories, best sellers, hours and location, Messenger, members count; checkout with ASAP or schedule, vouchers, rewards; live status; table ordering | Storefront |

---

## 8. The order engine (rules that never change)

- **One engine:** `private.build_order` serves the storefront (`place_order`) and POS (`create_pos_order`). Prices, tiers, discounts, stock and totals are computed **in the database**, never trusted from an app or from the API.
- **Money:** integer centavos. `total = subtotal - discount_total + delivery_fee`. Live columns are `integer` (up to about ₱21 million per order, enough); sums in reports use `bigint`.
- **Statuses (live names, extended):** open `placed`, `preparing`, `ready`, `out_for_delivery` (delivery and shipping only); done `completed`; end states `cancelled`, `expired`, and new `voided`.
- **Payment status:** `unpaid`, `pending` (proof uploaded), `paid`, and new `refunded`.
- **Fulfillment:** `walk_in`, `pickup`, `delivery`, and new `dine_in`, `shipping`. **Channel** (new): `storefront`, `pos`.
- **Transitions:** one table in SQL, mirrored by `ORDER_TRANSITIONS` and `nextActions()` in `packages/core`, proven equal by the shared `test/transition-cases` rows that pgTAP and Vitest both run. Every screen uses `nextActions()`.
- **Payments are rows** (deposits, split later): status `pending`, `confirmed`, `rejected`; new `kind` `payment` or `refund`; method `cash`, `gcash`, `maya`, `bank`, `cod`; `reference_norm` unique per shop among non-rejected payments.
- **Proofs:** private bucket `payment-proofs`; upload only while unpaid and under 7 days old, max 3 files; compressed in the browser; deleted after 30 days, the payment row stays.
- **Idempotency:** `client_key` unique per shop; a retry returns the first order. The API passes it through; it never generates its own.
- **Order numbers:** gap-free per shop per Manila business date (`order_counters`), shown as `#042`.
- **Expiry:** only GCash, Maya and bank orders expire unpaid (P5-5) and release stock (pg_cron every minute).
- **Stock:** cached balance on `item_variants`, changed only by one function (`private.move_stock`, new, writing a `stock_movements` row with a reason). Reserved at placement, released on cancel, void or expire.
- **Stamps:** given once for completed paid orders over the minimum, taken back on reversal; append-only `loyalty_ledger`; balance = sum; welcome stamp on join.
- **Lock order** (prevents deadlocks): shop settings, customer, vouchers, variants (ordered by id), order.
- **Abuse limits in the database:** at most 3 unpaid orders per phone per 30 minutes, 30 orders per shop per minute (P5-6). They stay even after the API adds its own limits.
- **Late, stale, scheduled:** late = today and waiting 20 minutes or more; stale = placed before today and not due today or later; scheduled = due after today.

---

## 9. Architecture

### 9.1 The shape

```
 Customers (phone)            Owners and staff (phone, tablet, laptop)
        |                                   |
  Storefront (Next.js, Vercel sin1)   Dashboard (Vite SPA, Vercel)
        |  public reads (cached)            |
        |  writes ------------+   +---------+  all calls
        |                     v   v
        |              NestJS API (Railway, Singapore)  <-- webhooks later (PayMongo)
        |                     |
        |        one transaction per request:
        |        role authenticated + the caller's JWT claims
        v                     v
   Supabase (same region): Postgres with RLS and the order engine in SQL,
   Auth (codes, passwords, staff logins), Storage (photos, proofs),
   Realtime Broadcast (order and shop channels), pg_cron
        |
        +--> Realtime pushes straight to the apps (no API in between)
```

**The idea in one line:** NestJS becomes the one door for every app request, permission check, integration and background job; Postgres stays the one place where money, stock and stamps can change. This keeps the live MVP's strongest property (decision D6: the database itself refuses a wrong write) while giving the product a real backend.

### 9.2 Where the code lives: `apps/api` in the same monorepo, on a long-lived `next` branch

- **Same monorepo** (`apps/api`), not a new repo: it imports `packages/core` (Zod schemas, money, permissions, transitions), so the API and the apps can never disagree on a shape; one CI, one lockfile, one set of rules (`AGENTS.md`).
- **Long-lived integration branch `next`**, created from `dev`. Every Blueprint B prompt is a short branch `ag/n<id>-<name>` with a PR into `next`. Why: `next` carries new migrations (staff, stock movements, shifts) that must not reach staging or production until a module is finished. `dev` stays releasable for Blueprint A.
- **Sync weekly:** a PR from `dev` into `next` (you click Merge) so `next` never drifts far. Conflicts are rare because `apps/api` is new and modules are new folders.
- **Promotion:** when a module is finished and tested on the Next environment, a PR from `next` into `dev` brings it in **switched off** (feature switch per shop, section 10). Before that PR, the prompt renames the module's migration files to timestamps newer than the newest on `dev`, because the Supabase CLI refuses migrations older than the last one applied. CI then builds a fresh database from all migrations and runs every pgTAP test, which proves the order works.
- **End state:** when the full product is live, `next` is retired and everyone works from `dev` again.

### 9.3 Database: keep Supabase-hosted Postgres (not Railway Postgres)

| | Supabase Postgres (chosen) | Railway Postgres |
| --- | --- | --- |
| Live data | Already there; no data move | Full dump and restore, downtime or dual-writing |
| Auth | `auth.users`, codes, sessions, staff logins work as today | Must replace Supabase Auth or sync users across |
| RLS | Policies use `auth.uid()` and work unchanged | Must rebuild the claims mechanism by hand |
| Storage, Realtime, pg_cron | Same database, triggers already broadcast | Separate services to add |
| Cost | Already paying Supabase Pro | Extra database bill plus Supabase anyway for Auth |
| Backups | Daily backups on Pro | Must set up |

Railway hosts only the API process. Region: the same as the Supabase project (expected Singapore, to confirm in Blueprint A G16), so each API call to the database is a few milliseconds.

**Connection:** the Supavisor **transaction pooler** (port 6543, IPv4), with prepared statements off. Every request runs inside one transaction, so transaction pooling is safe.

### 9.4 Data access: Drizzle ORM (not Prisma)

**Choice: Drizzle ORM with the `postgres` (postgres.js) driver.** Pin exact versions at scaffold time in `docs/stack-versions.md`.

Why Drizzle:
1. **The schema already exists and stays owned by `supabase/migrations`.** `drizzle-kit pull` reads the database and writes TypeScript table definitions. We never use `drizzle-kit push` or Drizzle migrations. Prisma's strength is its own migration system, which would fight the Supabase CLI.
2. **The engine lives in SQL functions.** Drizzle's `sql` template calls them with parameters (`select * from public.place_order(${payload})`) with no workaround.
3. **RLS needs a per-request transaction that sets the role and claims.** Drizzle documents exactly this pattern for Supabase. In Prisma it needs client extensions around interactive transactions.
4. **Thin runtime:** no query engine binary, small cold start, plain SQL in logs.
5. One less source of truth: no `schema.prisma` beside Zod and the generated types.

Rule: the pulled schema file is committed and CI fails if it differs from a fresh pull (same as `database.types.ts` today).

### 9.5 Authentication: verify Supabase JWTs in the API

- The apps keep signing in with Supabase Auth exactly as today (6-digit codes, passwords, staff hidden emails). They send `Authorization: Bearer <access token>` to the API.
- `AuthGuard` verifies the token with **`jose`** against the project's public keys (JWKS) at `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`, cached in memory. It checks signature, `exp`, `iss` (`https://<project-ref>.supabase.co/auth/v1`), `aud` (`authenticated`) and `role`. No network call per request; this is what `getClaims()` does in the apps.
- **Prerequisite:** the project must use Supabase's asymmetric **JWT signing keys**. If it still uses the legacy shared secret, migrate first (manual step B-M3). Never put the legacy JWT secret in Railway.
- Guests (storefront without login) call `@Public()` routes; the API uses `anon` claims for them.
- A JWT stays valid until it expires (default 1 hour). So the tenant check (9.6) reads the membership from the database on every request: a removed staff member loses access on the next call, not an hour later.
- The Supabase **secret key** is used only in two places: `StaffModule` (creating and resetting staff logins through the Admin API, replacing the old `staff` Edge Function) and `JobsModule` (deleting old proofs from Storage). Never in the request path of any other module.

### 9.6 Tenant isolation: five layers, so one missed check cannot leak another shop's data

| Layer | What | What it protects against |
| --- | --- | --- |
| 1. Guards | Global guard chain: Throttler, Auth, Tenant, Permission. `TenantGuard` finds the caller's shop from `tenant_members` (user id from the verified token, `status = 'active'`), never from a URL or body. `PermissionGuard` checks `@Can('orders.manage')` against `role_permissions` | Wrong role, wrong shop in a request body |
| 2. Database context | Every request's database work runs through one helper: begin, `set local role authenticated`, `set_config('request.jwt.claims', <verified claims>, true)`, work, commit. RLS then filters every row exactly as it does for the apps today | A query that forgets `where tenant_id = ...` |
| 3. Zero-privilege login | The API connects as its own login role `api_user`: no `bypassrls`, no table grants of its own, only membership in `authenticated` and `anon`. A query that skips layer 2 fails with "permission denied"; it cannot read anything | A developer bypassing the helper |
| 4. SQL functions check again | Engine functions call `private.has_permission(tenant, permission)` (ported from the old repo) before changing anything | A guard misconfigured on one route |
| 5. Tests that fail the build | (a) A metadata test lists every route and fails if one has neither `@Public()` nor `@Can(...)`. (b) A cross-shop end-to-end suite signs in as shop A and calls every route with shop B's ids: every answer must be 403 or 404. (c) pgTAP cross-shop tests stay | Regressions over time |

Lint rule: only `apps/api/src/db/` may import the database client; modules receive the request-scoped transaction.

### 9.7 Modules (NestJS) mapped to features

| NestJS module | Owns | Old repo source to port |
| --- | --- | --- |
| `ConfigModule`, `DbModule`, `AuthModule`, `TenancyModule`, `HealthModule` | Environment, connection, JWT, shop context, `/health` | none |
| `AuditModule` | Request id and actor passed to SQL; activity log reads | `private.write_audit`, `audit_chain`, `get_activity_log`, `verify_audit_chain` |
| `ShopsModule` | Shop, settings, hours, closures, payment accounts, delivery zones, tables, Messenger, tax, store QR | `update_tenant_settings`, `save_business_hours`, `save_closure`, `save_payment_account`, `save_delivery_zone`, `save_dining_table`, `regenerate_table_qr` |
| `StaffModule` | Seats, create, reset, turn off, remove, first login | `supabase/functions/staff`, `list_staff`, `can_manage_staff`, `enforce_seat_limit`, `complete_first_login` |
| `AccountModule` | Profile, security, preferences | `update_my_profile`, `touch_last_seen` |
| `CatalogModule` | Items, variants, options, categories, photos, price tiers, bulk edits, cost | `save_item`, `duplicate_item`, `bulk_update_prices`, `set_items_status`, `set_variant_costs`, `get_item_costs` |
| `InventoryModule` | Stock movements, adjustments with reasons, low stock | `private.move_stock`, `adjust_stock`, `set_sold_out` |
| `StorefrontModule` | Quote, place order (with Turnstile), proof submit, order by token, member join and account | `quote_order`, `place_order`, `submit_payment_proof`, `get_order`, `join_as_member`, `get_my_account` (live) |
| `OrdersModule` | Board, detail, advance, cancel, void, review and record payment, tracking, history, old-order clean-up | `advance_order`, `cancel_order`, `review_payment`, `record_payment` (live); `void_order`, `close_stale_orders`, `set_order_tracking` (old) |
| `PosModule` | POS quote and sale, senior/PWD, manual discount with PIN | `quote_pos_order`, `create_pos_order`, `private.apply_pos_discounts` |
| `ShiftsModule` | Open, cash in/out, blind close | `open_shift`, `add_cash_movement`, `close_shift`, `get_my_open_shift` |
| `ApprovalsModule` | Owner PIN, approvals | `set_approval_pin`, `has_approval_pin`, `private.verify_pin` (escalating lock) |
| `PrepModule` | Kitchen and packing tickets | `advance_order` with `prep.update`, `prep_can_start` migration |
| `MembersModule` | Stamp rule, ledger, adjust stamps, insights | `save_loyalty_rule`, `adjust_stamps`, `get_member_insights` |
| `CustomersModule` | List, detail, notes, block, COD allowed, anonymize, promo export | `list_customers`, `get_customer_detail`, `update_customer`, `anonymize_customer`, `export_promo_contacts` |
| `MarketingModule` | Vouchers, promotions, announcements | `save_voucher`, `set_voucher_active`, `private.apply_marketing`, `save_announcement` |
| `ScheduleModule` | Advance orders, lead days, deposits, calendar | `get_schedule`, `get_upcoming_scheduled`, `private.check_preorder_lead` |
| `ReportsModule` | Overview, series, top items, payment mix, categories, staff, hourly, CSV | `get_report_overview`, `get_sales_series`, `get_top_items`, `get_payment_mix`, `get_category_breakdown`, `get_staff_breakdown`, `get_sales_by_hour_range` |
| `StorageModule` | Usage meter, media list, delete unused, proof clean-up | `get_storage_usage`, `list_tenant_media`, `private.media_in_use` |
| `NotificationsModule` | New-order email, alerts bell, web push | `alerts`, `mark_alerts_read`, `push_subscriptions` |
| `JobsModule` | Outbox worker, scheduled jobs | `private.expire_unpaid_orders` stays in pg_cron |
| `PlatformModule` | `/admin` approvals, support sessions, billing states | `admin_set_tenant_status`, `start_support_session`, `end_support_session`, `platform_admins` |
| `IntegrationsModule` (late) | PayMongo webhooks, Meta Conversions API, Google Sheets | `set_google_sheet` (stub) |

### 9.8 Order engine, money, stock and stamps: where each rule is enforced

| Invariant | Enforced in SQL | NestJS adds |
| --- | --- | --- |
| Money computed server-side in centavos | `private.build_order` | Zod rejects decimals and negative quantities before the call |
| Gap-free numbers | `order_counters` row lock | nothing |
| No double orders | `client_key` unique per shop | passes the client's key through; an `Idempotency-Key` header maps to it |
| Stock never changes without a reason | `private.move_stock` only, `stock_movements` row | the reason list from core |
| Stamps once, reversible | completion and reversal triggers, append-only ledger | nothing |
| Paid only after a human check | `review_payment`, `reference_norm` unique | permission `orders.manage`, audit request id |
| Transitions | one SQL table, mirrored in core | `nextActions()` to show buttons |
| Voids and manual discounts need the PIN | `private.verify_pin` with escalating lock | rate limit on PIN attempts |

**Why the engine stays in SQL even with NestJS:** (1) during the move, the storefront still calls the same functions, so one copy of the rules serves both doors; (2) row locks and constraints are the simplest correct answer to two cashiers selling the last item at once; (3) it is decision D6, which the live MVP is built and tested on (pgTAP files 01 to 07). If you later want a rule in TypeScript, it can move one function at a time behind the API, with the pgTAP test kept as the proof.

### 9.9 Realtime

Keep Supabase Realtime Broadcast from database triggers (`realtime.send`): topic `order:<token>` (public, the receipt) and `shop:<tenantId>` (private, the board, Home, kitchen). Because the API writes through the same SQL, the triggers fire exactly as today. NestJS has no WebSocket server. The private channel policy on `realtime.messages` today allows any shop member (`private.is_shop_member`, migration `20261012040000_orders.sql`). The Staff module adds a pgTAP test that a removed staff member and a member of another shop cannot join the channel, and switches the check to `orders.view` if a future role should not see orders.

### 9.10 Storage

Keep Supabase Storage buckets `shop-media` (public) and `payment-proofs` (private) and their policies. Files go straight from the phone to Storage; no file passes through Railway (cheaper, faster, no upload limits to tune). The API reads usage from `storage.objects` and deletes unused files and 30-day-old proofs in `JobsModule`.

### 9.11 Jobs and cron

| Work | Where | Why |
| --- | --- | --- |
| Expire unpaid orders (every minute) | pg_cron (stays) | pure database work, already tested |
| Daily summaries (if reports need them) | pg_cron 02:05 Manila | pure database work |
| New-order email, alerts, web push | `JobsModule` outbox worker | needs an external API and retries |
| Delete 30-day-old proofs | `JobsModule` daily | needs the Storage API |
| Billing state changes | pg_cron daily, email from the outbox | |

**Outbox pattern:** SQL writes a `notification_outbox` row in the same transaction as the order. The worker picks rows with `for update skip locked` every 5 seconds, sends, marks done, retries with backoff, gives up after 5 tries. No Redis and no BullMQ at this size. Scheduled jobs use `@nestjs/schedule` with a Postgres advisory lock, so two replicas never run the same job twice.

### 9.12 Rate limiting and abuse

- `@nestjs/throttler` (in memory while there is one replica): place order 10 per minute per IP, proof submit 10 per minute per IP, PIN checks 5 per minute per user, sign-in helper routes 5 per minute.
- Express `trust proxy` set to 1 so the client IP comes from Railway's `X-Forwarded-For`.
- **Cloudflare Turnstile** verified in `StorefrontModule` before `place_order` (this is where decision P5-6 lands).
- The database limits stay as the last line.

### 9.13 Audit log

- Written **in SQL, in the same transaction** as the change (`private.write_audit`), so no change can happen without its record.
- The API passes request id, IP and user agent with `set_config('app.request_id', ..., true)`; `write_audit` stores them.
- Restore the old hash chain (`private.audit_chain`, `verify_audit_chain`) as a migration, and widen the action list beyond the MVP's 5: price change, stock adjust, void, manual discount, shift close, cash in/out, staff change, settings change, support session start and end.

### 9.14 Contracts, validation and errors

- Request and response shapes are Zod schemas in `packages/core/src/contracts/api/`. A small custom `ZodValidationPipe` (about 30 lines, no extra package) validates inputs and strips unknown keys.
- `packages/api` uses the same schemas to call the API, so the apps keep calling the same functions they use today (section 10).
- One error shape: `{ code, message }`, codes from core. Postgres errors raised by the engine (with their code in the error hint) become 400, 403, 404 or 409.

### 9.15 Logs and health

- `nestjs-pino` JSON logs with request id; redact `authorization`, phone, email and address (Data Privacy Act).
- `GET /health` runs `select 1`; Railway restarts the service when it fails.
- Error tracking (Sentry) later, only if Railway logs are not enough.

### 9.16 Environments

| Environment | Git branch | Supabase project | Railway environment | Apps |
| --- | --- | --- | --- | --- |
| Local | any | `supabase start` (Docker) | `pnpm dev` (API on port 4000) | localhost |
| Next | `next` | **Next** (new, Free, in the staging organization) | `next` | Vercel previews of `next` branches |
| Staging | `dev` | Staging (Blueprint A, A-1) | `staging` (add when the first module reaches `dev`) | Vercel previews |
| Production | `main` | Production | `production` (add at the first release that uses the API) | Vercel production |

`db-deploy.yml` gains a third mapping: push to `next` deploys migrations to the Next project. The Next project holds no real data and may be reset at any time.

### 9.17 Railway setup

- One Railway project `smart-app-ph`, one service `api`, region **Southeast Asia (Singapore)** or the Supabase region if different.
- Build from a **Dockerfile** at `apps/api/Dockerfile`, built from the repo root with `turbo prune` so only the API and its packages are copied. Node 24 slim, non-root user, `node dist/main.js`. A Dockerfile is predictable for a pnpm monorepo; the TindaTrack setup used Nixpacks for a single Laravel app, which does not fit here.
- **Build check (first scaffold prompt):** `packages/core` exports TypeScript source (`"exports": "./src/index.ts"`). The API build must bundle it (Nest CLI webpack builder with the `@smartapp/*` packages allow-listed) and prove `node dist/main.js` starts. NestJS needs decorator metadata, which plain esbuild does not emit, so do not swap in esbuild.
- Config as code: `apps/api/railway.json` with the Dockerfile path, `healthcheckPath: /health`, restart policy on failure, 1 replica. Watch paths: `apps/api/**`, `packages/core/**`, `pnpm-lock.yaml`.
- **No migrations in Railway.** Unlike TindaTrack's `preDeployCommand` (migrate and seed), our migrations only go through `db-deploy`. The API must never change the schema.
- Variables (set in Railway, never in the repo): `DATABASE_URL` (pooler, user `api_user`), `SUPABASE_URL`, `SUPABASE_PROJECT_REF`, `SUPABASE_SECRET_KEY` (Staff and Jobs only), `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `ALLOWED_ORIGINS`, `NODE_ENV`.
- Custom domain `api.webserbisyo.com`: a CNAME record in Vercel DNS pointing to the target Railway shows.

### 9.18 Cost (estimate, check railway.com/pricing before you subscribe)

| Item | Monthly |
| --- | --- |
| Railway Hobby plan (includes US$5 of usage) | US$5 |
| One small NestJS service always on (about 0.25 GB memory, light CPU) | about US$3 to 8 of usage per environment |
| Next and staging environments | a few dollars each; turn off when idle |
| Supabase Next project | US$0 (second free project in the free organization) |
| **Added by Blueprint B** | **about US$5 to 15** |

With launch costs (about US$45), the platform runs at about US$50 to 60 per month: roughly 5 shops at ₱599 cover it.

### 9.19 Security checklist for the API

Helmet headers; CORS allow-list (`app.webserbisyo.com`, `shop.webserbisyo.com`, preview domains only in Next and staging); JSON body limit 100 kB (files never pass through); no `x-powered-by`; Zod on every input; parameterised SQL only; secrets only in Railway variables; exact versions and the 14-day rule for new packages (the TanStack supply-chain incident in `docs/stack-updates.md`); `pnpm audit` in CI; staff and admin routes rate-limited; support mode read-only by default.

---

## 10. Strangler migration path (no downtime)

**Principle: one database, two doors.** The old door is a Supabase RPC call from `packages/api`; the new door is an HTTP call to NestJS from `packages/api`. Both reach the **same SQL functions** in the **same database**. So moving a feature is a change in `packages/api` only; screens do not change; switching back is instant; no data moves.

**The switch:** `packages/api` gets a transport per area (`rpc` or `http`), chosen by a build-time list (`VITE_API_AREAS`, `NEXT_PUBLIC_API_AREAS`, for example `staff,inventory,orders`). Rollback: remove the area from the list and redeploy, or use Vercel's Instant Rollback.

| Stage | When | What moves | Risk |
| --- | --- | --- | --- |
| S0 | Now to launch | Nothing. The API runs only in the Next environment. The live MVP does not know it exists | none |
| S1 | After launch | **New modules are API-first:** Staff and roles, Inventory, Shifts and PIN, POS, Prep, Marketing, Schedule. Their SQL lands as migrations; screens call the API from day one; no RPC version is written | low (new features, switched off per shop until ready) |
| S2 | When S1 modules are stable | **Owner reads:** reports, customers, Home | low, read-only |
| S3 | Next | **Owner writes:** order actions, catalog, settings, members | medium; the SQL functions are unchanged, only the transport |
| S4 | With Turnstile | **Storefront writes:** quote, place order, proof submit go through the API | medium; test with both demo shops, then one real shop |
| S5 | 2 weeks after each area moves with no old-door calls | **Close the old door:** revoke `execute` on that area's public RPCs from `authenticated` and `anon` | low; check Supabase logs first |

**Stays on the old door on purpose:** public storefront reads (`get_storefront`, `get_order`) from the Next.js server, because they are cached and latency-sensitive. They can move last, or never.

**Feature switches per shop:** each new module is behind `tenants.features` (ported from the old repo's `set_feature`) so a finished module can be turned on for one pilot shop first.

**Schema changes for the full product (all additive, no renames, D10):**
- New tables: `role_permissions`, `stock_movements`, `shifts`, `cash_movements`, `approval_pins`, `approvals`, `vouchers`, `voucher_redemptions`, `applied_discounts`, `announcements`, `dining_tables`, `alerts`, `push_subscriptions`, `support_sessions`, `platform_admins`, `price_tiers`, `notification_outbox`, and `daily_summaries` only if reports need it.
- Widened checks (constraint replaced in the same migration, Zod updated in the same PR, transition cases updated): `tenant_members.role` adds `cashier`, `prep`; `orders.status` adds `voided`; `orders.payment_status` adds `refunded`; `orders.fulfillment` adds `dine_in`, `shipping`; `payments` adds `kind`; `orders` adds `channel`, `table_id`, a due time for advance orders.
- Backfills: `role_permissions` seeded from core; existing owners stay `owner`; one opening `stock_movements` row per tracked variant from the current stock.

**Data migration:** none. The same database serves both doors at every stage.

---

## 11. Feature inventory

Built-in-old-repo means the SQL and a screen exist on `redesign/v3-home`; it is ported, not invented. Built-in-MVP means it is live.

| Feature | Old repo | Live MVP | Status for Blueprint B | Module |
| --- | --- | --- | --- | --- |
| Owner sign-up, setup, waiting | built | built | keep; API in S3 | Shops |
| Shop approval and suspension | built (`/admin`) | SQL by the founder | to build (screen) | Platform |
| Support mode | built | no | to build | Platform |
| Staff accounts, 3 seats, first login | built (Edge Function) | no | to build (port) | Staff |
| Roles and permissions | built | owner only | to build (port) | Staff, Tenancy |
| Owner profile and security | built | no | to build | Account |
| Settings: profile, hours, closures, order types, payments, zones (flat) | built | built | keep | Shops |
| Dining tables and table QR, dine-in | built | no | to build | Shops, Storefront |
| Delivery by distance and shipping by region | built (distance), planned (region) | no | to build | Shops |
| Tax, approval PIN, store QR, this device | built | store QR via ShareShop only | to build | Shops, Approvals |
| Storage manager | built | no | to build | Storage |
| Activity log with hash chain | built | 5 actions, no chain | to build | Audit |
| Catalog: items, variants, options, categories, photos | built | built | keep | Catalog |
| Price tiers, bulk edits, duplicate, cost | built | no | to build | Catalog |
| Inventory with movements and reasons | built | stock count only | to build | Inventory |
| Storefront browse, checkout, receipt, my orders | built (v1) | built (redesigned) | keep; polish in Blueprint A | Storefront |
| Storefront privacy page | built | no | Blueprint A (A10) | Storefront |
| Payments with proof and review | built | built | keep | Orders |
| Orders board and detail | built | built | keep | Orders |
| Order history, void, tracking link, old-order clean-up | built | tracking only | to build | Orders |
| Members, stamps, welcome stamp, peso reward | built (no welcome) | built | keep; free-item reward later | Members |
| Customers list | built (full) | built (basic) | extend (notes, block, COD, anonymize, export) | Customers |
| Promotions and vouchers, announcements | built | no | to build | Marketing |
| POS with senior/PWD and slip | built | no | to build | POS |
| Shifts and blind count | built | no | to build | Shifts |
| Kitchen / Packing | built | no | to build | Prep |
| Advance orders and Schedule, deposits | built | pickup today or tomorrow only | to build | Schedule |
| Reports (basic) | built | built | keep | Reports |
| Full reports, payment mix, staff, categories | built | no | to build | Reports |
| Google Sheets | stub | no | to build (late) | Integrations |
| New-order email | no | no | to build (first) | Notifications |
| Alerts bell, web push | built (tables) | no | to build | Notifications |
| Demo data | built (script) | built (SQL) | keep SQL; demo refresh button | Shops |
| Billing states | planned | columns only | to build | Platform |
| Online Shop editor, themes | placeholder | colours only | to build (late) | Online Shop |
| PayMongo, Meta CAPI | planned | no | to build (late) | Integrations |
| Native app (Capacitor), Bluetooth printers | planned | no | to build (late) | none (dashboard) |

---

## 12. Build order: one module or page per prompt

Each module follows the same 3-step pattern: a **database prompt** (migration, RLS, grants, pgTAP tests, types), an **API prompt** (NestJS module, Zod contracts, cross-shop tests), then **one prompt per page**. All on `ag/n...` branches into `next`.

### N0. Foundations (no screens)

| ID | Prompt | Done when |
| --- | --- | --- |
| N0.1 | `next` branch, Next Supabase project, `db-deploy` mapping, `AGENTS.md` section for the API (mostly by hand, B-M1 to B-M3) | a migration pushed to `next` lands only in the Next project |
| N0.2 | Scaffold `apps/api`: NestJS, config with Zod, health, pino logs, error filter, Zod pipe, Dockerfile, CI job (typecheck, lint, test, build) | `node dist/main.js` starts and imports `@smartapp/core`; CI green |
| N0.3 | Auth and tenancy: JWKS guard, `TenantGuard`, `@Can`, `@Public`, the request transaction helper, `api_user` role migration, route metadata test, cross-shop test harness with the two demo shops | shop A's token gets 403 or 404 on every shop B route |
| N0.4 | Railway: `next` environment, domain for Next, health check, variables | `GET /health` is green on Railway |
| N0.5 | `packages/api` transport switch and a first read endpoint (`GET /me`) | dashboard on the Next preview shows the shop name through the API |

### Modules (after N0)

| Order | Module | Prompts |
| --- | --- | --- |
| M1 | Roles, permissions, staff | DB (role_permissions, has_permission, roles check, seat limit, realtime policy), API (StaffModule with Admin API), pages: Staff list, Add staff dialog, staff first login, role-based navigation and dock |
| M2 | Account and audit | DB (hash chain, more actions), API, pages: My account, Activity log |
| M3 | Notifications (first) | DB (outbox, triggers), API (worker, Resend), page: notification settings; new-order email to the owner |
| M4 | Inventory | DB (stock_movements, move_stock, opening balances), API, pages: Inventory, adjust dialog, low-stock chip |
| M5 | Settings extras | DB (tables, tax, PIN, approvals), API, pages: Tables and QR, Tax, Approval PIN, Store QR |
| M6 | Dine-in on the storefront | storefront table route and checkout type |
| M7 | Shifts | DB, API, pages: Open shift, Cash in/out, Close shift with blind count, shift report |
| M8 | POS | DB (quote_pos_order, create_pos_order through build_order, senior/PWD), API, pages: Sell (a: grid and cart, b: Charge), slip print |
| M9 | Voids and approvals | DB (void_order, verify_pin), API, pages: void dialog with PIN |
| M10 | Kitchen / Packing | API, page: Prep board |
| M11 | Advance orders and Schedule | DB (due time, lead days, deposits), API, pages: Schedule, storefront date picker |
| M12 | Marketing | DB (vouchers, redemptions, applied discounts, announcements), API, pages: Promotions list, voucher editor, Announcements, storefront voucher field |
| M13 | Customers extended | API, pages: customer detail with notes, block, anonymize, export |
| M14 | Full reports | API, pages: Reports overview, breakdowns, CSV |
| M15 | Shipping by region | DB, API, settings page, storefront checkout |
| M16 | Platform | DB (platform_admins, support_sessions, billing states), API, pages: `/admin` shops list, approve, support mode |
| M17 | Storefront through the API | S4: quote, place order with Turnstile, proof submit |
| M18 | Integrations and native | PayMongo, Meta CAPI, Sheets, Capacitor |

Why this order: the outbox and the new-order email come early because the system paper's own risk table relies on them. Staff and permissions come before POS, Shifts and Kitchen because those screens are for staff. POS comes after Inventory and Shifts because a sale needs both.

---

## 13. UI system (kept, corrected)

Kept from Master Blueprint section 11, with live names:
- Only installed parts (shadcn on Base UI, ReUI, DiceUI, the Magic UI confetti and number ticker) and `packages/ui/src/patterns`. No new UI library without approval.
- Colours from `packages/ui/src/styles/tokens.css`: navy surfaces, logo-blue actions, marigold `highlight` only to celebrate, member green for members, neutral grey hover (`--accent`), one meaning per colour from `STATUS_TONE`.
- Fonts: Plus Jakarta Sans plus Geist Mono, self-hosted. Icons: Tabler only, filled icon on the selected nav item; Fluent 3D objects for tiles and categories.
- Charts: lazy-loaded, token colours, one y-axis, every chart has a tooltip and a screen-reader sentence; payment mix is a donut.
- Layout: one nav per device; `PageBody` sizes full 1600, wide 1280, settings 880, form 720, narrow 480; touch targets 44 px (56 px kitchen); no sideways scroll at 390 px.
- Words: every visible string in `packages/core/src/words.ts` (not `t()`; an i18n layer is a later decision); vocab for Menu or Products, Kitchen or Packing.
- Money via `formatPeso`; dates in Manila time; every page has loading, empty, error, offline, closed shop, long text and big amount states.
- Motion and the quality bar: Blueprint A section 4 applies to every Blueprint B page too.

---

## 14. Demo data (corrected)

- Demo data lives in SQL (`seed.sql`, `private.demo_reset`), for `juans-cafe` (food) and `tala-apparel` (retail), reset from the SQL editor (D7, P5-13). Each Supabase project (staging, Next) has its own demo shops.
- Each new module's database prompt extends `demo_reset` with realistic rows (staff, shifts, stock movements, vouchers, advance orders), tagged so a reset never touches real rows.
- A "Refresh demo data" button in Settings, Demo data, only for shops with `tenants.is_demo = true`.
- Targets for ads (kept): about 124 members, +9 this week, members about 38% of sales, 5 members one stamp from a reward, 3 in progress, 1 to verify, 2 advance orders tomorrow.

---

## 15. Rules for agents and how we work (corrected)

- Claude writes one prompt file at a time (`docs/prompts/N1-...md`), reviews every PR, and writes approved decisions into `docs/decisions.md`.
- Antigravity codes, database included, following `AGENTS.md`; it branches `ag/n<id>-<name>` from `next`, commits per step, runs checks, takes screenshots, updates `docs/PROGRESS.md` and `docs/CHANGELOG.md`, pushes the branch, and opens a PR into `next`.
- You approve the plan in Antigravity, ask Claude to review, test on the Next preview, and merge.
- Hard rules kept from the old `CLAUDE.md`: never read or print `.env*`; exact versions only and ask before any new package; database changes only as new migration files with RLS, grants and policies in the same file; apps never import `@supabase/*`; no `any`, no `as` casts, no `@ts-ignore`; no `if (business_type === ...)`; add, do not edit (new modules are new folders plus one registry line); one source per shape; no force-push, no `reset --hard`.
- New for the API: no module may import the database client directly; every route has `@Public()` or `@Can()`; the secret key only in Staff and Jobs; the API never changes the schema.

---

## 16. Decisions in force (consolidated)

**Product (kept):** members are the main selling point; "Members" everywhere, "Top suki this month"; promo export only consented contacts; guest checkout always, join prompt after the order; a screenshot never marks an order paid; advance orders never late before due; old orders separate from late ones; breadcrumbs on desktop; shop status on phone is an icon; demo button only in demo shops; the dashboard ships as an installable web app first; Capacitor, storefront editor and Meta tracking after launch.

**Platform (kept, with live status):** owners sign up in the app and wait for approval (SQL now, `/admin` in M16); one business per owner for now; up to 3 staff seats; support mode instead of impersonation.

**Data (kept):** money in centavos; no Postgres enums (text plus CHECK mirrored by Zod); RPC arguments prefixed `p_`; Manila business date; report functions compute from orders; `tenants.slug` never changes; a member is a customer with `member_since` set (D5).

**Live MVP decisions that override the Master Blueprint:** D2, D3, D5, D6, D7, D9, D10, B4, UI-2 (at launch), P2-1 (storefront light-only), P2-2 (migrations only through `db-deploy`), P2-4 (6-digit codes), P2-5 (domains), P5-5, P5-6, P4-31 (peso reward).

**New in this blueprint (to record after your approval):**

| ID | Decision |
| --- | --- |
| B-1 | NestJS API in `apps/api` of the same monorepo, built on a long-lived `next` branch |
| B-2 | Database stays on Supabase; Railway hosts only the API |
| B-3 | Drizzle ORM; schema owned by `supabase/migrations`; `drizzle-kit pull` only |
| B-4 | API verifies Supabase JWTs with JWKS (`jose`); JWT signing keys required |
| B-5 | Five-layer tenant isolation (section 9.6), including the zero-privilege `api_user` |
| B-6 | Money, stock and stamps stay in SQL functions; NestJS calls them |
| B-7 | Realtime and Storage stay on Supabase; no WebSocket server in the API |
| B-8 | Outbox plus worker for email and push; pg_cron for pure database jobs |
| B-9 | Strangler by area with a transport switch in `packages/api`; public storefront reads stay on RPC |
| B-10 | Railway: Dockerfile build, Singapore, no migrations in Railway |

**Superseded (do not follow):** the founder Google Sheet as admin panel; "Phase 1 food only"; the Dec 1 and Feb 1 dates; Inter font and the old blues; Lucide icons; the hand-built Kanban; the "max 4 dock items" rule; Master Blueprint pricing until Q1 is answered; "Claude Code does the database" (E8).

---

## 17. Critical assessment: risks and mitigations

| # | Risk | Likelihood and impact | Mitigation |
| --- | --- | --- | --- |
| R1 | **Two backends at once.** During S1 to S4, some features use RPCs and some use the API; a bug may need fixing in two places | High, medium | The engine stays in SQL (one copy of the rules); move by area; close the old door per area (S5); every PR says which door it touches |
| R2 | **A data leak between shops through the API.** In NestJS every endpoint must remember the shop; one missed check could leak | Medium, severe | The five layers in 9.6; the zero-privilege login makes a forgotten check fail closed; the route metadata test and the cross-shop suite fail the build |
| R3 | **Antigravity time.** About 2 weeks left, shared with the launch | Certain, high | Launch work wins every conflict (Blueprint A section 10). In 2 weeks, only N0.1 to N0.5. Everything else continues in Claude Code threads with the same prompt files |
| R4 | **Antigravity (Gemini) is weaker at strict backend rules than at UI** | Medium, high | Small prompts with exact code locations; CI tests (pgTAP, cross-shop); Claude reviews every PR; no merge without both |
| R5 | **Solo founder load:** Vercel (2 projects), Railway (up to 3 environments), Supabase (3 projects), GitHub Environments | High, medium | Add Railway environments only when needed (9.16); click-by-click steps in section 19; one release checklist; weekly release rhythm |
| R6 | **`next` drifts from `dev`**, then a big painful merge | Medium, medium | Weekly sync PR `dev` into `next`; `apps/api` and new modules are new folders; promote modules one at a time |
| R7 | **Migration order across branches** breaks `supabase db push` | Medium, medium | Rename timestamps at promotion (9.2); CI rebuilds a fresh database from all migrations on every PR |
| R8 | **Extra latency** (Vercel to Railway to Supabase) | Low, low | Same region for all three; public storefront reads stay direct and cached |
| R9 | **Monorepo build:** `packages/core` exports TypeScript source, NestJS needs decorator metadata | Medium, medium | N0.2 must prove a production start; Nest webpack builder bundles `@smartapp/*` |
| R10 | **Supabase key changes:** legacy keys retire at the end of 2026; JWT signing keys | Medium, high | Use publishable and secret keys and JWKS from day one (B-M3) |
| R11 | **Supply chain** (the TanStack incident) | Low, severe | Exact versions, packages at least 14 days old, lockfile, `pnpm audit` in CI, ask before any new package |
| R12 | **Cost creep** | Low, low | Estimate in 9.18; Railway usage limit set in the dashboard; turn off idle environments |
| R13 | **Launch slips because of NestJS** | Medium, high | Blueprint B never blocks Blueprint A; S0 means the live MVP does not know the API exists |
| R14 | **Transaction pooler quirks** (prepared statements, session settings) | Medium, low | Prepared statements off; every setting is `set local` inside the request transaction |
| R15 | **Personal data in logs** | Medium, medium | Log redaction (9.15); short log retention |

**My honest view, as risk only:** the expensive part of a NestJS rebuild is not NestJS; it is re-writing rules that already work. This blueprint avoids that by keeping the engine in SQL and moving the doors, not the rules. If you prefer the rules themselves in TypeScript, do it one function at a time behind the API, with the pgTAP test as the proof, after the full product is live.

---

## 18. What fits in Antigravity's 2 weeks, and what comes after

| In the 2 weeks (alongside the launch) | After (Claude Code threads, same prompts) |
| --- | --- |
| N0.1 `next`, Next project, `db-deploy` mapping | M1 to M18 |
| N0.2 scaffold and Docker build | Railway `staging` and `production` environments |
| N0.3 auth, tenancy, isolation tests | Stages S1 to S5 |
| N0.4 Railway `next` environment | |
| N0.5 transport switch and `GET /me` | |
| M1 database prompt only if time remains | |

Rough size after the 2 weeks: M1 to M4 about 2 to 3 weeks; POS, Shifts, Voids and Kitchen (M7 to M10) about 3 to 4 weeks; the rest about 4 to 6 weeks, at your testing pace.

---

## 19. Steps you do by hand (Blueprint B)

**B-M1. Create the `next` branch**
1. On github.com open the repo. Click the branch dropdown (top left, shows `main`), choose `dev`.
2. Click the dropdown again, type `next` in the box, click **Create branch next from dev**.
3. Settings, Rules, Rulesets: edit `protect main and dev` (Blueprint A, M3), **Add target**, include `next`. Save.

**B-M2. Create the Next Supabase project**
1. supabase.com/dashboard, switch to the `Smart App PH Staging` organization (Blueprint A, M1).
2. **New project**, name `smart-app-ph-next`, generate and save the password, same region as production. Create.
3. GitHub, Settings, Environments, **New environment** `next`; add `SUPABASE_PROJECT_REF` (variable) and `SUPABASE_DB_PASSWORD` (secret) with the Next values.

**B-M3. Check the JWT signing keys (each Supabase project)**
1. Supabase project, **Project Settings**, **JWT Keys**.
2. If the page says the project uses the **legacy JWT secret**, click the button to migrate to **JWT signing keys**, then create and rotate to the new key as the page guides. Do staging and Next first, production last, and test sign-in after each.
3. Tell Claude when done; N0.3 depends on it.

**B-M4. Give the API its database password**
After N0.3's migration creates `api_user` on a project: Supabase, **SQL Editor**, run `alter role api_user with password '<a long generated password>';` (save it in your password manager). The connection string for Railway is in **Connect** (top of the project page), **Transaction pooler**; replace the user with `api_user.<project-ref>` and the password with yours.

**B-M5. Railway**
1. railway.com, **Login with GitHub**, approve access to the repo only.
2. **New Project**, **Deploy from GitHub repo**, pick the repo. Name the project `smart-app-ph`, the service `api`.
3. Service, **Settings**: Source branch `next`; Config file path `apps/api/railway.json`; Region **Southeast Asia**.
4. **Variables**: add each variable from section 9.17 (values from Supabase, Resend, Cloudflare). Never paste them into chat.
5. **Settings**, **Networking**, **Generate Domain** for testing. Later, **Custom Domain** `api.webserbisyo.com`; Railway shows a CNAME target. In Vercel, **Domains**, `webserbisyo.com`, **DNS Records**, **Add**: type `CNAME`, name `api`, value the Railway target.
6. Workspace, **Usage**, set a usage limit (for example US$20) so a mistake cannot run up a bill.
7. Plan: **Hobby** is enough at this size.

---

## 20. Open questions for you (with my recommendation)

| # | Question | My recommendation |
| --- | --- | --- |
| Q1 | Price: ₱599 (live D9) or ₱799 (Master Blueprint)? | ₱599 founding price now; a higher price for new shops when Staff and POS ship |
| Q2 | Keep money, stock and stamps in SQL functions, with NestJS calling them (B-6)? | Yes. It is the safest way to rebuild with NestJS and run two doors during the move |
| Q3 | Long-lived `next` branch (B-1), or build on `dev` behind switches? | `next`, as you asked; it keeps unfinished migrations off staging and production |
| Q4 | Database on Supabase (B-2)? | Yes |
| Q5 | Drizzle (B-3)? | Yes |
| Q6 | API domain `api.webserbisyo.com`? | Yes |
| Q7 | Does the raised centre Sell button come back with POS (supersedes UI-2 then)? | Yes, only for roles with `sell.use` and only when the shop has `pos` on |
| Q8 | Extra staff seats beyond 3: price? | ₱99 per seat per month, decide before M1 pages |
| Q9 | Deposits for advance orders: required? Default percent? | Optional per item, default 50% when on |
| Q10 | COD at launch for all shops, or only with a blocklist? | Owner switch (live), add a per-customer block in M13 |
| Q11 | VAT: are most pilots VAT-registered? (changes senior/PWD maths in POS) | Ask the pilot shops before M8 |
| Q12 | BIR: stay "ORDER SLIP · NOT AN OFFICIAL RECEIPT"? | Yes |
| Q13 | Member sign-in with Google too? | Not yet; email code only |
| Q14 | Public storefront reads stay on direct RPC (B-9)? | Yes |
