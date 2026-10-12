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


## Phase 3

- P3-1: Default privileges revoke table and function access from `anon` and `authenticated` in `public` (and EXECUTE from PUBLIC globally for functions made by `postgres`); every grant is explicit.
- P3-2: Owners change only the shop name and settings, and only while active; slug, status, plan, paid_until and is_demo change only by founder SQL.
- P3-3: `create_my_shop` adds default hours from P5.1, when `business_hours` exists.
- P3-4: `slug_available` and `private.try_uuid` were added beyond paper 7.4.
- P3-4a: `packages/api/src/database.types.ts` is generated; only the lint rule `no-redundant-type-constituents` is off for that one file, because the generator writes `never | …` unions.
- P3-5: One customer login for the storefront host; membership is per shop (a `customers` row, P5.5). One login can be both a customer and an owner.
- P3-6: `packages/api` exposes plain functions (client first) and hooks; screens use only the names in `docs/api-surface.md`.
- P3-7: Auth pages (log in, sign up, forgot password, setup, waiting, paused) are routes outside the shell, guarded by one pure `decideRoute`. The 6-digit code input (`CodeInput`) and `useCountdown` live in `packages/ui` because both apps use them.

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
- P4-6 (P4.0 build, 2026-10-12): The DiceUI files were hand-copied from the registry JSON (the `shadcn add` command was blocked in the cloud session) and trimmed: `responsive-dialog` uses plain React context instead of the DiceUI store (its render-time ref writes break the React compiler lint) and gains `desktop="right"` for the storefront cart; `qr-code` makes the PNG and SVG in one effect and loads `qrcode` only when a QR is shown (no canvas part); `scroller` keeps the edge fades and click-to-scroll arrows, without press-and-hold or hover scrolling.
- P4-7: Status tones: New and Out for delivery blue (info), Preparing amber (warning), Ready and Completed green, Cancelled and Late red, Expired grey; payment Unpaid grey, To verify amber, Paid green, unpaid cash on delivery says "Pay on delivery". Why: amber means "needs you", red only for something that went wrong.
- P4-8: Logos and category photos are compressed to 512 px square (P4.0 prompt), not 256 px. Why: sharp on high-density phones at about 60 to 120 KB. P5.1 reuses `IMAGE_SIZES` from `compress-image.ts` instead of its own 256 px.
- P4-9: `PhoneField` is a plain input with a +63 prefix that accepts 0917…, 917… or +63 917… and tidies it on blur, instead of the DiceUI mask input. Why: masks fight pasted numbers and spaces; the rule lives once in `normalizePhPhone`.
- P4-10 (P4.1): A food shop's single thing for sale is a "Menu item", as the system paper says (VOCAB said "Item"). Nav labels and breadcrumbs can follow VOCAB, so the dashboard says Menu or Products.
- P4-11 (P4.1): "Add menu item" or "Add product" sits in the page's action row on tablet and desktop and in a `StickyActionBar` above the dock on phones, not inside the shell's top bar. Why: no slot system for page actions in the shell, and the thumb reaches the bottom bar.
- P4-12 (P4.1): The product editor has one low-stock number per item and saves it on every variant. Stock counts go through `set_stock` after `save_item`, matched by row order.
- P4-13 (P4.1): Add-on groups belong to the shop. The editor edits an item's groups in place (changes show on every item using the group, and it says so), can add a group made before, and removing a group from an item only unlinks it.
- P4-14 (P4.1): `item_has_orders` is in the core error list now so the editor already offers Archive; the database raises it from P5.3.
- P4-15 (P4.1): Kit fixes found while testing: sortable lists now drop with the keyboard (Space or Enter), `StickyActionBar` takes `aboveDock` on dashboard phone screens, and `InputGroup` (PesoField) is 44 px tall like `Input`.
- P4-16 (P4.2): "Pause orders now" is the `accepting_orders` switch only, with no reason field: the table has no column for a reason, and a UI checkpoint adds no migration. Walk-in always allows cash at the counter, so it is a hint, not a switch.
- P4-17 (P4.2): Each settings page saves on its own with one Save (`SettingsSection` gained `disabled`, `note` and `aboveDock`; it no longer clips its sticky Save bar). Pages warn before leaving with unsaved changes. `LeaveGuard`, `useMediaUpload` and the form `row()` path helper moved to `apps/dashboard/src/app/` so products and settings share them.
- P4-18 (P4.2): Four ready-made colour sets (Uling, Kape, Ube, Dagat) live in `packages/core/src/color.ts`. The Look page warns (does not block) when text or buttons fall under 4.5:1 contrast. The shop link is `shopUrl(slug)` on `https://shop.webserbisyo.com`.
- P4-19 (P4.2): Saving business hours, closed days and add-on choices no longer uses upsert: owners may only update the non-key columns (P5.1 column grants), so saved rows are updated and new rows inserted (closed days insert with "ignore duplicates"). No grant was widened.
- P4-20 (P4.3): The cart rules live in `packages/core/src/cart.ts` (merge same lines, 1 to 99, totals in centavos, sold out, quick add, what is still to choose). Cart prices are an estimate from the menu; `quote_order` prices the order in P4.4. A line whose item, size or add-on is gone or sold out is flagged, left out of the subtotal, and Checkout stays off until it is removed.
- P4-21 (P4.3): Closed or paused shops keep the "+" visible but dimmed; tapping it shows the reason, and the item sheet's Add button is disabled with the reason ("Closed now", "Orders paused"). Paused (orders off or busy) wins over closed. The database's `isOpen` decides; `openState` only words it.
- P4-22 (P4.3): Image URLs for the shop pages are built on the server (`shopMedia`) so client code needs no Supabase client. `ShopTheme` gained `root` so sheets and dialogs (outside the page wrapper) use the shop colours. `next/image` is used for the cover only, limited to the `shop-media` bucket. Until P4.4, Checkout opens a placeholder page that says the cart is saved.
- P4-23 (P4.4): The storefront now uses React Hook Form, `@hookform/resolvers` and TanStack Query, at the versions
  the dashboard already pins (no new package in the repo). Order hooks run in the browser only, through one
  `DataProvider` (QueryClient + the browser Supabase client) in the shop layout; shop data stays server-read.
- P4-24 (P4.4): Pickup slots start 20 minutes out (the database needs 15 at the moment of placing, so a slow form
  still keeps its time) and end 15 minutes before closing. A closed shop's checkout starts on the first open slot.
  A slot that passes while the form is open falls back to "As soon as possible".
- P4-25 (P4.4): The quote sends a stand-in address, so typing the address does not re-price on every key; it waits
  for a delivery area when the shop needs one. The real address goes only to `place_order`.
- P4-26 (P4.4): "Remember me on this phone" keeps name, mobile and email per shop (`smartapp.customer.<slug>`); the
  privacy box is ticked again on every order. The receipt uses the customer's words for steps and payment ("Placed",
  "Checking payment") with the same colours as the dashboard, says "ORDER SLIP · NOT AN OFFICIAL RECEIPT" (paper 10),
  and offers the shop's account again on the proof card. Send proof waits for the photo upload to finish.

## Backend plan (2026-10-11, approved by the founder)

Recommended in the "Plan backend: P3a, P3b, P5" thread and approved by the founder on 2026-10-11. The checkpoint
prompts build them; their P5 numbers stay the same so later checkpoints add only the other P5 lines.

- P5-5: Only GCash, Maya and bank orders expire unpaid (`orders.expires_at`, default 30 minutes); cash and COD
  orders wait for the owner. Why: a cash customer may arrive late and still pay; an unpaid transfer order would
  otherwise hold stock forever.
- P5-6: Cloudflare Turnstile moves to P6. Until then `place_order` is limited in the database: at most 3 unpaid
  orders per phone per 30 minutes and 30 orders per shop per minute. Why: fewer moving parts for launch, and the
  limits stop the same spam without a third-party script.
- P5-10: A member's past guest orders are linked to their account only with proof: an order token from that phone,
  or the same email. Otherwise joining asks them to join from a receipt. Why: anyone can type someone else's phone
  number; linking by phone alone would show strangers another person's orders and stamps.
- P5-13: The two shops made in P3b, Juan's Cafe (`juans-cafe`, food) and Tala Apparel (`tala-apparel`, retail),
  become the demo shops: `select private.demo_setup();` (P5.2) fills them with a real catalog, and
  `private.demo_reset` (P5.6) refills them with orders. Why: one pair of test shops for every checkpoint, owned by the
  founder, with no second set to keep in step.
- P5-14: No mock data in the apps. Each P4 screens step runs after the P5 step that builds its API, and screens call
  only the names in `docs/api-surface.md`. Why: screens built on fake data had to be rewired in the first build.
- P5-15: Deleting payment proofs after 30 days moves to P6 (needs an Edge Function or a scheduled script; Supabase
  blocks deleting storage files from SQL).
- P5-16: Every new member gets 1 welcome stamp when they join a shop whose stamp card is on (ledger reason
  `welcome`, once per member per shop; built in P5.5). Why: a card that starts with a stamp already filled gets
  finished faster, and it gives guests a reason to join from the receipt (screens thread decision F4, approved by
  the founder 2026-10-11).

## Phase 5

- P5-1 (P5.1, 2026-10-12): Composite foreign keys keep every child row in its parent's shop: each parent has
  `unique (id, tenant_id)` and each child points at `(parent_id, tenant_id)`. RLS checks the row's own `tenant_id`;
  the key makes sure the parent is in the same shop. Update grants never include `tenant_id` or a parent key.
- P5-2: Stock changes only through `set_stock` and the order functions; prices and names are plain owner edits.
  Clients cannot write `item_variants.stock_on_hand` on insert or update.
- P5-3: Images are compressed in the browser to two WebP sizes; `shop-media` paths are immutable
  (`<tenantId>/<folder>/<uuid>.webp` and `-thumb.webp`) and cached for a year. Folders: `logos`, `covers`, `items`,
  `categories`, `qr`.
- P5-17: `shop-media` has an owner-only select policy on the shop's own folder. Why: Supabase Storage deletes a file
  only when the caller can also select it, so without it removing a photo would silently keep the file; public
  URLs still need no policy, and nobody can list another shop's files.
- P5-18: `private.is_open_now` takes an optional time (`p_at`, default now) so the database tests can run the same
  open/closed cases as `openState` in core (`packages/core/src/test/open-cases.ts`). `set_stock` takes a count of 0
  or more; to stop counting, the item's `trackStock` is turned off.

- P5-19 (P5.2, 2026-10-12): `get_storefront` leaves out items in a hidden category and items with no variant for
  sale (all archived), as well as hidden and archived items. An unknown, pending or suspended slug raises the new
  error code `shop_not_found`; `getStorefront` turns it into `null` and the page shows not found. The query plans on
  the demo data already use existing indexes, so no index was added.
- P5-20: `demo_ensure_shop` keeps an existing shop's owner and name and only refreshes the demo fields (is_demo,
  active, plan `demo`, paid a year ahead, settings, hours). Juan's Cafe's "Outside town" zone is saved but inactive
  (fee on Messenger), so it shows only in the dashboard. The demo tools have no execute grant: only the SQL editor
  and `seed.sql` run them.
- P5-21: The per-shop install file (`/<slug>/manifest.webmanifest`) uses the shop's logo when there is one, plus
  platform icons (`apps/storefront/public/icons/icon-192.png` and `icon-512.png`, maskable). Per-shop generated
  icons stay in P6.

- P5-4 (P5.3, 2026-10-12): `order_events` has `kind` (`status`, `payment_submitted`, `payment_confirmed`,
  `payment_rejected`) and `actor` (`customer`, `owner`, `system`); payment steps are events too, so the receipt
  timeline shows them. Payment events have no from/to status. `created_at` uses the clock, so two steps in one
  transaction keep their order. Closes P1-5.
- P5-7: Order live updates use Realtime Broadcast from a trigger: a public `order:<token>` topic for the receipt and
  a private `shop:<tenantId>` topic for the dashboard (only that shop's members may join it). The receipt polls
  every 15 seconds while its channel is not joined.
- P5-22: A guest checkout reuses a guest customer row found by phone as it is, and never links or changes a
  member's row (one with a login): that order gets no customer. Why: a phone number proves nothing (same reason as
  P5-10); P5.5 adds the signed-in member path. Customer stats (`order_count`, `total_spent`, `last_order_at`) are
  kept by the owner's order actions in P5.4, not at placing time.
- P5-23: `quote_order` takes a `QuotePayload` (the choices only: fulfillment, lines, payment method, pickup time,
  delivery, reward), so the checkout can show totals before the form is filled. Its `problems` are
  `{ lineIndex, code, variantId }` with `code` one of `item_unavailable`, `out_of_stock`, `invalid_options` (worded
  by `errorWords`); problem lines are left out of `lines` and the totals. `place_order` raises the first one, with
  the variant id as the error detail. A sold-out add-on and a wrong number of add-ons are both `invalid_options`.
- P5-24: Error codes added: the slice 3 list plus `not_found` (an unknown receipt link; `getOrder` returns `null`).
  `payment_unavailable` covers a method the order type does not allow (cash for delivery, COD outside delivery,
  cash for pickup without pay-later) and a transfer with no active account. A scheduled pickup is allowed while the
  shop is closed or busy now, as long as the pickup time itself is open.
- P5-25: `delivery_zones` gained `unique (id, tenant_id)` so orders point at zones with a composite key like every
  other child (P5-1). A product with order lines cannot be deleted (`item_has_orders`, a trigger); deleting a whole
  shop still works. Proof uploads are limited to 10 files per order folder in the storage policy, and anon may run
  only `private.order_accepts_proof` and `private.try_uuid` (for that policy).
- P5-26: `usePlaceOrder` takes the payload without `clientKey` (`OrderInput`): the hook keeps one key per checkout,
  reuses it on a retry and starts a new one after a success. `useQuote(slug, payload | null)` waits while the
  payload is null. `useMyOrderTokens` keeps the last 20 receipt tokens per shop in localStorage
  (`smartapp.orders.<slug>`).
- P5-8 (P5.4, 2026-10-12): Completing an order requires it to be paid; the board shows Mark paid first for unpaid
  cash and COD orders.
- P5-9: `packages/core` `nextActions` and the SQL transitions share one table of test cases
  (`packages/core/src/test/transition-cases.ts`, 32 rows). Vitest checks each row against `nextActions`; the pgTAP
  test `05_owner_orders.test.sql` runs the same rows against `advance_order`, `record_payment` and `review_payment`,
  and a Vitest check fails if the two lists differ.
- P5-27: Cancelling or expiring an order adds back exactly what each line took, for lines whose variant still exists
  and whose item still counts stock (`stock_on_hand` not null). If the owner recounted in between, the return goes on
  top of the new count. Only open orders end this way, so stock comes back once.
- P5-28: `record_payment` takes `cash` for walk-in and pickup and `cod` for delivery (`payment_unavailable`
  otherwise); a GCash, Maya or bank order paid by hand takes that method. Starting an unpaid GCash, Maya or bank
  order raises `not_paid`, the same as completing an unpaid one. A rejection reason is 3 to 200 characters (the
  `review_payment` contract now says so too); a tracking link is `https://` and at most 500 characters. The reason and
  the tracking link are optional database arguments (`default null`), so the generated types make them optional.
- P5-29: `audit_log.action` is one of `payment_approved`, `payment_rejected`, `payment_recorded`, `order_cancelled`,
  `stock_set` (`AUDIT_ACTIONS` in core); owners of an active shop read their shop's lines and nobody writes them
  directly. Cancelling closes a proof still waiting (rejected, "Order cancelled") and puts the order back to unpaid; a
  paid order keeps its payment and the timeline note ends with "(paid: refund by hand)".
- P5-30: Slice 4 in `packages/api`: `BoardOrder` is `{ order, lines }` (core); `useOrders` and `useOrderDetail`
  take `null` while there is no shop or order yet; query keys `qk.orders(tenantId)` (every list of a shop),
  `qk.orderList`, `qk.orderDetail`, `qk.proofUrl` and `qk.dashboardToday`. The live channel logic is
  `watchShopOrders` (no React, tested with fake timers); `useShopOrdersLive` wraps it. `useProofUrl` renews the
  5-minute link every 4 minutes.
