# Progress

Agents read this file every time, so keep it short: tick the prompt, then at most 2 log lines per prompt
(what changed, gates passed, PR number). Plans and details live in the blueprints, not here.

Done before this file (v0.5.0, PRs #1 to #21): P1 to P5.6, every MVP checkpoint. See `docs/CHANGELOG.md`.

## Track A: MVP launch (`docs/blueprints/A-MVP-Launch-Blueprint.md`, PRs into `dev`)

Stage 0, way of working
- [x] A0.1 Rules and docs (AGENTS.md, PROGRESS, CHANGELOG, PR template)
- [ ] A0.2 Staging database (by hand M1 to M4, then the prompt)
- [ ] A0.3 Test harness and small fixes
  - Fix: sheets and popups own their height and one scroll area (cart sheet cut off, double and sideways scrollbars).

Stage 1, storefront v2 (`docs/storefront-v2.md`; replaces A1 to A12, decision SF-1)
- [x] SF1 Foundation and redesign (shell, palette, every page, privacy, icons, splash, brand editor)
- [x] SF2 Database (rewards, shop content, order messages, delivery, ratings, push)
- [ ] SF3 Features and demo content (banners, rewards, thread, tracking, push, SEO, caching, demo photos)
- [ ] SF4 Smoke tests and docs (Playwright 390/1280, docs, repo description)

Stage 2, dashboard
- [ ] D0a Login, sign up, forgot password
- [ ] D0b Setup, Waiting, Suspended
- [ ] D1 App shell
- [ ] D2 Orders board
- [ ] D3 Order detail
- [ ] D4 Home
- [ ] D5 Products list
- [ ] D6 Product editor (a, b)
- [ ] D7 Categories
- [ ] D8 Settings hub and Shop look
- [ ] D9 Business info and Hours
- [ ] D10 Order types and Payments
- [ ] D11 Stamp card
- [ ] D12 Customers
- [ ] D13 Reports
- [ ] D14 Owner account
- [ ] D15 Dashboard installable

Stage 3, launch
- [ ] L1 Pre-launch audit
- [ ] L2 Fix rounds
- [ ] L3 Production setup (by hand)
- [ ] L4 Acceptance run

## Track B: full product on NestJS (`docs/blueprints/B-Full-Product-NestJS-Blueprint.md`, PRs into `next`)

Foundations
- [ ] N0.1 `next` branch, Next Supabase project, db-deploy mapping (mostly by hand)
- [ ] N0.2 Scaffold `apps/api`
- [ ] N0.3 Auth and tenancy
- [ ] N0.4 Railway
- [ ] N0.5 Transport switch and `GET /me`

Modules (each: database prompt, API prompt, one prompt per page)
- [ ] M1 Roles, permissions, staff
- [ ] M2 Account and audit
- [ ] M3 Notifications
- [ ] M4 Inventory
- [ ] M5 Settings extras
- [ ] M6 Dine-in on the storefront
- [ ] M7 Shifts
- [ ] M8 POS
- [ ] M9 Voids and approvals
- [ ] M10 Kitchen / Packing
- [ ] M11 Advance orders and Schedule
- [ ] M12 Marketing
- [ ] M13 Customers extended
- [ ] M14 Full reports
- [ ] M15 Shipping by region
- [ ] M16 Platform
- [ ] M17 Storefront through the API
- [ ] M18 Integrations and native

## Backlog: after launch (decision SF-24)

- SMS order updates (sender name registration takes 2 to 4 weeks; about ₱0.50 per SMS)
- Lalamove API booking ("Book rider", live quote, status webhooks)
- Owner campaign sending (push, email, SMS) with per-channel marketing opt-ins
- Apple Wallet and Google Wallet stamp cards
- Subdomains per shop (`<slug>.webserbisyo.com`)
- Google reviews shown on the storefront
- Free-text chat in the order thread
- Map picker, address search and road distance for delivery (pins are in at launch, SF-26)
- Staff QR scanning for stamps and rewards
- Extra reward rules: halfway bonus, birthday stamp, daily stamp cap
- Precaching menus for offline browsing (Serwist)

## Log

- SF2: Storefront v2 database schema, migrations, RLS and API surface (banners, announcements, 3 reward kinds, custom claims, order messages, delivery info, ratings, pins, push subscriptions and outbox).
  Gates passed: pnpm local reset, 761 pgTAP tests (01-13) passed, pnpm check green, pnpm build green.
- SF1: Storefront v2 foundation and redesign (shell, one-colour palette, semantic toasts/buttons, all pages restyled, privacy, shop icons/splash, brand editor).
  Local gates passed (pnpm check, pnpm build, Playwright 390/1280).
- A0.1: AGENTS.md as the one rulebook (CLAUDE.md points to it), PROGRESS, CHANGELOG, PR template, blueprints in
  `docs/blueprints/`, prompt template without "push to dev". Docs only; check green.
