# Progress

Agents read this file every time, so keep it short: tick the prompt, then at most 2 log lines per prompt
(what changed, gates passed, PR number). Plans and details live in the blueprints, not here.

Done before this file (v0.5.0, PRs #1 to #21): P1 to P5.6, every MVP checkpoint. See `docs/CHANGELOG.md`.

## Track A: MVP launch (`docs/blueprints/A-MVP-Launch-Blueprint.md`, PRs into `dev`)

Stage 0, way of working
- [x] A0.1 Rules and docs (AGENTS.md, PROGRESS, CHANGELOG, PR template)
- [ ] A0.2 Staging database (by hand M1 to M4, then the prompt)
- [ ] A0.3 Test harness and small fixes

Stage 1, storefront
- [ ] A1 Shop shell and system pages
- [ ] A2 Shop home
- [ ] A3 Menu
- [ ] A4 Item sheet
- [ ] A5 Cart sheet and cart bar
- [ ] A6 Checkout (a, b)
- [ ] A7 Receipt (a, b)
- [ ] A8 My orders
- [ ] A9 Account and member card
- [ ] A10 Privacy notice
- [ ] A11 Install and offline (a, b)
- [ ] A12 Storefront speed pass

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

## Log

- A0.1: AGENTS.md as the one rulebook (CLAUDE.md points to it), PROGRESS, CHANGELOG, PR template, blueprints in
  `docs/blueprints/`, prompt template without "push to dev". Docs only; check green.
