# Decisions

One line per decision. Newest phase at the bottom. The system paper wins if a line here disagrees with it.

## System paper v1.1, section 15

- D1: Two apps, a Next.js storefront and a Vite dashboard, sharing three packages (ui, core, api); the dashboard ships to iOS and Android later with Capacitor.
- D2: No admin screen at launch; the founder approves shops and records payments with SQL.
- D3: No POS, kitchen display or staff at launch; Messenger hand-off instead.
- D4: Members and stamps are in the launch version; they are the selling point.
- D5: A member is a customer with member_since set (a linked login).
- D6: Money, stock and stamps change only in database functions; simple owner edits use row-level security write rules.
- D7: Demo data lives in SQL in the database (seed.sql and demo_reset), reset from the SQL editor with no AI tokens.
- D8: Shop look is logo, cover and three colours (60/30/10); the editor comes later.
- D9: ₱599 per month early plan; tools break even at about 5 shops.
- D10: Same database design as the first build, trimmed; later features plug in without renaming tables.
- D11: Fixed places for code: apps (screens), ui (design), core (rules), api (data), supabase (database); lint enforces it.

## Build plan v1.1, "Before phase 1"

- B1: Two apps, Next.js storefront and Vite dashboard: yes.
- B2: Three shared packages, ui, core, api: yes.
- B3: Approvals and subscriptions by SQL, as saved snippets in the Supabase SQL editor: yes.
- B4: Order types at launch are walk-in, pickup and delivery; dine-in and shipping right after launch: yes.
- B5: Members and stamps in the launch version: yes.
- B6: Demo data in SQL inside Supabase (demo_reset run from the SQL editor): yes.
- B7: Reuse proven code from the first repo as copy-and-trim reference in reference/, never whole folders: yes.
- B8: Platform domain: pick one short domain (needed for Resend, app.domain and shop links). Open: not chosen yet; needed by Phase 2.6.

## Phase 1

- P1-1: Package scope is `@smartapp/*`.
- P1-2: The enum values in packages/core/src/schemas/enums.ts are the only allowed values; the database CHECK constraints will mirror them.
- P1-3: Database function names follow system paper 7.4 exactly (create_my_shop, get_storefront, get_order, shop_settings table…).
- P1-4: TypeScript fields are camelCase; packages/api maps them to snake_case columns.
- P1-5: OrderEvent has no actor field yet: actor (customer, owner, system) is not in the agreed enum list; add it with the order engine migration (P5.3).
- P1-6: Node 24 LTS is enforced (`engines` + `engine-strict`); pnpm is pinned with `packageManager`.
- P1-7: The two apps have placeholder typecheck and lint scripts until Phase 2 gives them source (tsc fails on an empty project).
- P1-8: `tooling/` is a workspace package (`@smartapp/tooling`) so the lint rule tests run inside `pnpm check`.
- P1-9: Reference code is copied from the first repo's newest branch, `redesign/v3-home` (commit dff6bf9), because main lacks the order rules and upload code.

## UI decisions (2026-10-11, before Phase 2)

- UI-1: The UI kit is 51 components mapped to MVP screens (`docs/ui-kit.md`), installed in P2; more only when a screen needs one.
- UI-2: The phone dock has no raised centre button at launch (its job was Sell/POS, which is not in the MVP).
- UI-3: Category icons are a Fluent 3D icon (curated, self-hosted, from Microsoft's MIT `fluentui-emoji`), an emoji, or an uploaded photo. Built in P4.5, stored in P5.1 (`categories.icon_kind`, `icon_value`).

## Phase 2

- P2-1: Storefront is light-only at launch, themed by the shop's 60/30/10 colours; the dashboard has light and dark.
- P2-2: Migrations reach the hosted project only through the `db-deploy` GitHub Action on `dev`.
- P2-3: Words live in `packages/core/src/words.ts`; Menu/Products-style words come from `VOCAB[businessType]` only.
- P2-4: Auth emails use 6-digit codes only (no links), sent by Resend SMTP from mail.webserbisyo.com.
- P2-5: Platform domain is `webserbisyo.com`, used only through subdomains so the existing site is untouched: storefront `shop.webserbisyo.com/<slug>`, dashboard `app.webserbisyo.com`, auth email from `mail.webserbisyo.com`.
- P2-6: The UI kit is the 51 components in `docs/ui-kit.md`, installed in P2 (not P4); more only when a screen needs one.
- P2-7: Shop colours reach the storefront only as `--shop-60/30/10` (+ `-foreground`) through `ShopTheme`; shared components keep the platform tokens, so a Button looks the same in both apps.
- P2-8: The shadcn CLI's `cn` package is replaced by our own `cn` (clsx + tailwind-merge) in `packages/ui/src/lib/utils.ts`; `next-themes` is not used (the Toaster reads the `.dark` class).
- P2-9: ReUI data-grid keeps only the base table, header, filter, visibility, pagination and scroll-area files; its drag, virtual and cell-selection variants were removed (not in the MVP), and so was `@tanstack/react-virtual`.
- P2-10: The chart-pie-donut-text block exists only in shadcn's Radix style, so it was copied from that registry and pointed at our Base UI card and chart.
- P2-11: CSS custom properties in `style` are typed by augmenting React's `CSSProperties` (`packages/ui/src/lib/style.ts`, `cssVars()`), so no component casts.
- P2-12: Dashboard module pages use one splat route (`/$`) and the registry picks the screen; `/kit` is its own route, outside the nav.
- P2-13: Type packages (`@types/react`, `@types/react-dom`, `@types/node`, `@types/canvas-confetti`) were added as dev dependencies; they ship no runtime code.


## P4 screens (2026-10-11, approved by the founder)

Full reasoning, research and sources: `docs/ux-plan.md`. Prompts: `docs/prompts/P4.0` to `P4.7`.

- P4-F1: P4 has no mock data and runs interleaved with P5: P4.0 (after P3b) → P5.1 → P4.1, P4.2 → P5.2 → P4.3 → P5.3 → P4.4 → P5.4 → P4.5 → P5.5 → P4.6 → P5.6 → P4.7. Why: each screen is built and tested once, on real data from the seeded shops `juans-cafe` (food) and `tala-apparel` (retail); the first build's mock data cost tokens and broke.
- P4-F2: Six kit additions, installed in P4.0: DiceUI `responsive-dialog`, `qr-code`, `stat`, `status`, `scroller` and shadcn `progress`, plus npm `qrcode` 1.5.4 (the DiceUI QR code needs it). Kit total 57. `qrcode.react` is dropped. Why: each one replaces code we would otherwise write by hand for a launch screen (one cart overlay instead of two, shop and receipt QR, Home numbers, status dots, category tabs, upload and stamp progress).
- P4-F3: No stepper and no new timeline component. Why: checkout is one short page (Baymard: the questions asked matter more than steps), the ReUI stepper ships an `eslint-disable`, and the installed ReUI `timeline` already supports `orientation="horizontal"`.
- P4-F4: Every new member gets 1 welcome stamp when they join (stamp rule in P5.5, shown in P4.6). Why: pre-filled cards get finished faster (Kivetz et al., endowed progress), and it gives customers a reason to join from the receipt.
- P4-1: Stamp cards and members stay in the MVP; they are the main selling point.
- P4-2: UX-1 to UX-9 in `docs/ux-plan.md` section 1 are the screen rules: no mock data; shared parts first on `/kit`; only the F2 additions; one photo-first storefront layout (no list/grid switch); one-page checkout; the ReUI timeline for order status; status = icon + word + colour from one table in `packages/core`; Home has no "% vs last week" chips or date-range pickers; every screen ships with loading, empty, error and offline states and 0 console errors.
- P4-3: P4.0 owns these shared files, and later checkpoints reuse them instead of making a second copy: `packages/core/src/money.ts`, `time.ts`, `status-look.ts`, `order-rules.ts` (`nextActions`, `boardColumn`, `timelineSteps`, `canCancel`, `isLate`, `itemsSummary`; P5.4 makes them match the SQL), `phone.ts`, and `packages/ui/src/lib/compress-image.ts`.
- P4-4: Orders have no Undo, because the backend has no reverse steps; a wrong step is fixed by cancelling. Completing an unpaid cash or COD order needs Mark paid first (`not_paid`).
- P4-5: UI-3's Fluent category icons are built in P4.0 (110 icons copied into `reference/` from the old repo, then into `packages/ui/src/assets/fluent/`) and picked in P4.1.
