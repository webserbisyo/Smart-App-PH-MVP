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
- P4-27 (P4.5, 2026-10-12): The dashboard nav badge and the tab title ("(2) Orders · Juan's Cafe") count the New
  column: orders the owner must act on first. The shell keeps one live connection to the shop's orders for every
  page, so the count and the chime work on any screen. "Live updates lost" shows only after 10 seconds without the
  channel, with Refresh; the list still polls meanwhile (P5-30).
- P4-28 (P4.5): The new-order chime is a short tone made with Web Audio (no sound file, no package). Browsers block
  sound until the page is touched, so a "Turn on order sound" chip shows until the owner taps it once.
- P4-29 (P4.5): Start, Mark ready, Out for delivery, Complete and Mark paid move the card at once and roll back with
  the error words if the database refuses; Approve, Reject and Cancel wait for the database. Board columns, buttons,
  Mark paid's method and whether Cancel shows come only from `packages/core` (`boardColumn`, `nextActions`,
  `recordMethod`, `canCancel`, `canRecordPayment`, `paymentToReview`); a test fails if the orders feature compares a
  status itself.
- P4-30 (P4.5): Message opens the phone's SMS app (`sms:`), since orders have no Messenger id. The Member badge on
  board cards waits for P5.5/P4.6 (the order list has no member flag yet). Print slip prints only the slip, about
  72 mm wide in black, using print CSS in `apps/dashboard/src/styles.css`. On tablet and wider the board's columns are at
  least 14rem wide and wrap (2 columns next to the side panel at 1280 px, 3 at 1024 px, 5 on wide screens), so cards
  never get too narrow to read.
- P4-31 (P4.6, 2026-10-13): The stamp card settings page has a "Stamp card on" switch (cards start off, P5-32). The
  owner types the reward as a peso amount; its words are always "₱100 off your order" (`rewardLabel` in core), so
  there is no free-text reward. The members count switch lives on the same page.
- P4-32 (P4.6): The "Use ₱100 off" switch starts off and is shared by the cart and checkout. The cart shows an
  estimate (`rewardDiscount`, never more than the items); checkout shows the database's quote. When the database
  answers `reward_unavailable`, the switch turns off and says why. Checkout fills in the member's name, mobile,
  email and default address unless the customer already typed them.
- P4-33 (P4.6): The confetti fires once per reward on each device (`smartapp.reward.<slug>`). A reward given back by a
  cancelled order is the same reward, so it does not celebrate again.
- P4-34 (P4.6): The install card shows on the receipt and the account page. It is hidden in the Facebook, Messenger and
  Instagram browsers (they cannot add to the home screen), when already installed, and for 14 days after "Not now"
  (per shop). The browser's install event is caught as soon as a shop page loads, because it can fire before React
  is ready.
- P4-35 (P4.6): Members see their orders from any device on the Orders tab and the account page; orders placed on this
  phone without signing in follow them. The receipt says "+1 stamp when completed" only for orders that will earn one
  (open, from the minimum).
- P4-36 (P4.7): Home's In progress and the orders board share one set of order steps: `BoardCard`, `CancelDialog`,
  `TrackingDialog`, `useOrderSteps`, `useRuleSettings`, `useNow` and `stepCall` moved to `apps/dashboard/src/app/orders/`
  (as P4-17). The compact `OrderCard` now shows its step buttons when given any, so an order can be finished from
  Home; a customer's orders pass none.
- P4-37 (P4.7): Setup checklist rules (`packages/core/src/setup.ts`): logo set; at least one day of hours (a new shop's
  default hours count, so it starts at 1 of 5); an active GCash, Maya or bank account; an item that is not archived;
  order types ready = at least one on, each one on has a way to pay (the checkout rule), and delivery has an active
  zone or the fee on Messenger. With the defaults (walk-in and pickup, no pay at pickup) the last step ticks once the
  owner adds an account or turns on pay at pickup.
- P4-38 (P4.7): Home's attention chips open filtered lists: Orders `?show=to_verify` or `?show=waiting` (core
  `matchesAttention`, the same counts as `get_dashboard_today`) and Products `?stock=low`, each with "Show all".
- P4-39 (P4.7): Reports "Today" bars are per Manila hour, summed in the app from that day's orders with the P5-12
  rules (`hourlySales`); 7 and 30 days use `get_sales_report` days. The Reports average needs the paid-order count, so
  `get_sales_report` totals gained `paidOrders` (migration `20261013020000`); Home and Reports Today now show the same
  average. The chart (recharts) loads only on Reports and does not animate. The customer sheet shows a customer's last
  20 orders (`useOrders` scope `customer`). Customers "Download CSV" exports every customer the search and Members only
  filter find (`exportCustomersCsv`).
- P4-40 (P4.7): Share shop sits next to the greeting as a button that opens `ShareShop` (link, QR download). "Share on
  Messenger" shows on phones only and opens the Messenger app's share sheet (`fb-messenger://share`); Messenger has no
  share link for computers. Order changes now also refresh Home's members card, Reports and Customers.

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
- P5-11 (P5.5, 2026-10-12): Guests earn stamps on completed paid orders; joining reveals them. Redeemed stamps come
  back if the order is cancelled or expires.
- P5-31: Members do not read the `customers` table itself, because it holds the owner's notes and tags; their account
  comes from `get_my_account`, which leaves those out. The member policies on the ledger and addresses ask
  `private.my_customer_ids()` (security definer) for the caller's own rows. `MemberAccount` gained `history` (the latest
  20 stamp movements, newest first), so the card can show "Welcome stamp" (P5-16).
- P5-32: Every shop's stamp card row comes from a trigger on `tenants` (one place for `create_my_shop` and the demo
  tools) instead of a new `create_my_shop`; new cards start off: 10 stamps for "₱100 off your order", no minimum.
  `get_storefront` keeps its P5.2 body as `private.storefront_base` and adds `stampRule` and `memberCount` on top.
  Joining also records a privacy consent (source `join`). A member has at most 5 saved addresses (`invalid` past
  that); a new default clears the old one and the first address is the default. Ledger rows can never be updated.
- P5-12 (P5.6, 2026-10-13): Sales count paid orders that were not cancelled or expired, by Manila business date.
  Orders count every order except expired ones; open orders, waiting and to-verify count every open order whatever
  its date (a pickup for tomorrow is still open); the average is sales over the paid orders counted in sales; best
  sellers rank `order_items` of sales orders by quantity (top 5, ties by sales); top suki are the three members with
  the highest sales this Manila month. The definitions sit above `get_dashboard_today` in the migration.
- P5-33 (P5.6): No second `orders (tenant_id, business_date)` index: the unique key `orders_tenant_day_no`
  `(tenant_id, business_date, order_no)` already serves it (checked with `explain`). New: a partial index on open
  orders and one on members (`customers (tenant_id, member_since)`).
- P5-34 (P5.6): `demo_reset` builds orders straight from the shop's catalog (not through `place_order`, which checks
  opening hours and the clock) and turns the demo shop's stamp card on, since a demo shows it. Historical demo
  orders do not take stock; instead every tracked variant is set above its low mark except two. While it runs,
  `broadcast_order` sends nothing (`smartapp.demo_reset` setting), so an open dashboard does not chime hundreds of
  times. Demo tokens are `demo-` plus 16 random characters; real tokens are 22. Order numbers continue after any
  real order of the same day, and the counters are rebuilt from the orders that remain. `demo_setup` now refreshes
  the catalog only when the shop has no real orders left (otherwise `item_has_orders` would stop it), then runs
  `demo_reset`, so running it again is safe.
- P5-35 (P5.6): Slice 6 in `packages/api`: `useCustomers` is an infinite query whose `data` is the rows loaded so
  far (`hasNextPage`, `fetchNextPage` for "Load more"); its search matches a name, or a mobile typed as `09…`, `+63…`
  or `9…`, with `%`, `_` and quotes taken as plain text. `useUpdateCustomerNotes` trims notes and drops blank and
  repeated tags. `exportOrdersCsv` reads the orders 1000 at a time and adds a byte order mark so Excel shows ñ and ₱.
  The CSV text comes from core `ordersCsv` (`toCsv` puts `'` before cells starting with `=`, `+`, `-`, `@`, tab or
  carriage return). Keys `qk.memberInsights`, `qk.salesReport`, `qk.customers`, `qk.customerList`.

## Way of working (2026-10-14, decided by the founder)

- A-7: Two tracks. Track A finishes and launches the MVP on the current stack (`docs/blueprints/A-MVP-Launch-Blueprint.md`,
  integration branch `dev`). Track B builds the full product with a NestJS API in `apps/api` on Railway, Supabase
  staying the database, Auth, Storage and Realtime (`docs/blueprints/B-Full-Product-NestJS-Blueprint.md`, long-lived
  branch `next`). Track B never touches the live MVP until a module is promoted switched off.
- A-2: Claude writes one prompt at a time; Antigravity (or a Claude Code thread) codes it on `ag/<id>-<name>`
  (`claude/...` for Claude Code), takes screenshots at 390 and 1280 px, updates `docs/PROGRESS.md` and
  `docs/CHANGELOG.md`, and opens a PR into `dev` (Track B: `next`). Agents never push to `main`, `dev` or `next`
  and never merge; the founder merges. Why: a push to `dev` deploys migrations to the hosted database.
- A-8: `AGENTS.md` is the one rulebook for every agent; `CLAUDE.md` only imports it, so the two never drift.
  Antigravity loads a root `AGENTS.md` as an always-on workspace rule, so no separate `.agents/rules` file is kept.
  MCP connectors for agents are read-only by rule (`AGENTS.md`, "Using tools and connectors").

## Tools and local development (2026-10-15, decided by the founder)

- A-9: The Supabase CLI may be linked to the hosted project (`ssrveclilekzezcivclx`) for read-only commands. Nobody
  runs `supabase db push`, `db reset --linked`, `migration repair` or any other command that writes to it. Hosted
  schema changes go only through a migration file in a PR, applied by the `db-deploy` Action after the merge.
- A-10: Connectors. The Supabase MCP stays read-only (`read_only=true`, one project). The Supabase and Resend MCPs use
  access tokens instead of a browser login. The GitHub MCP is off (agents use the `gh` CLI); the Figma MCP is removed;
  the Resend CLI is not used. Vercel MCP runs through `mcp-remote`.
- A-11: Agents develop against a local Supabase stack in Docker (`docs/local-dev.md`, `pnpm local ...`) with full access
  there; demo shops locally come from the same SQL as live (`seed.sql`, `private.demo_reset`), not mock data.
- A-12: `docs/api-surface.md` lists every name the apps may call; a PR that changes a `public.` SQL function, a hook
  or a plain function in `packages/api` updates it in the same PR.
- A-13: Repo docs describe the current state only (what is installed, where it lives, the rules); history and
  debate stay in this file and in git.

Still waiting for the founder's yes (Blueprint A section 9): A-1 staging database, A-3 test packages (dashboard
render tests; the storefront gets Playwright smoke by SF-4), A-5 Turnstile timing. A-4 is settled by SF-20 and A-6 by
SF-13.

## Storefront v2 (2026-10-16, approved by the founder)

Spec: `docs/storefront-v2.md`. Prompts: `docs/prompts/SF1` to `SF4`.

- SF-1: The storefront is rebuilt in four prompts that replace Track A pages A1 to A12: SF1 front-end foundation and
  redesign (no database change), SF2 database, SF3 features and demo content, SF4 Playwright smoke and docs. The
  database comes before demo content so demo shops use real columns. SF1 runs after the overlay fix (sheets inside the
  screen, one scroll area).
- SF-2: Layout. Phone: top bar (logo, name, open state, Area pill, bell, avatar), floating 4-tab bar Home, Menu,
  Rewards, Orders (Rewards hidden when the stamp card is off), Account behind the avatar, cart bar only with items.
  Desktop from 1024 px: top nav, content max 1120 px, menu with a category rail and, from 1280 px, a sticky cart panel.
  Nav and overlays switch at the same 1024 px breakpoint. Checkout and receipt are one centred column (max 640 px).
- SF-3: Colour. The owner picks one brand colour (or a preset, or the logo colour); `shopPalette` in core fills the
  existing three columns as 60 page / 30 surfaces / 10 accent with 4.5:1 text. Three colours stay editable under
  Advanced with the contrast warning. Status colours never follow the shop (green success, red error, amber warning,
  blue info); sonner uses `richColors` mapped to our tokens. One filled shop button per screen.
- SF-4: New packages, exact versions: `embla-carousel-react` 8.6.0 and `embla-carousel-autoplay` 8.6.0 (SF1, via
  shadcn `carousel`), `web-push` 3.6.7 and `@types/web-push` 3.6.4 (SF3, `packages/api` server only),
  `@playwright/test` 1.64.1 (SF4, `tooling/e2e`). Nothing else.
- SF-5: Components are copy-in registry source where possible: ReUI `use-file-upload`, DiceUI `cropper`, `banner`,
  `rating`, shadcn `carousel`, `message`, `bubble`, `attachment`, Magic UI `dot-pattern`, `shine-border`. DiceUI
  `file-upload` is removed (one upload primitive). DiceUI `color-picker` stays (its eyedropper hides itself where the
  browser lacks it). Not used: `react-colorful`, `react-easy-crop`, `qrcode.react`, `vaul`, Serwist,
  `react-lite-youtube-embed`, colour libraries. Registry blocks are layout references, not installs.
- SF-6: Defaults for a new shop: brand `#2456D3`, initials logo, brand card instead of a banner, no announcement,
  about and contact hidden until filled, hours always shown, first enabled order type preselected, stamp card off (10
  stamps, ₱100 off, 1 welcome stamp when on), notifications off, no review link.
- SF-7: Rewards have three kinds: peso discount, free item (added at its price with an equal discount, so sales
  reports keep the item), custom prize (title, picture, description; the member claims it with a code, stamps are
  taken at the claim and returned if the owner cancels it). Stamps stay server-awarded. No stamps for reviews.
- SF-8: Location at launch is the shop's own delivery zones. "Use my location" only suggests the nearest zone that
  has a centre point. No map API or address search.
- SF-9: Delivery at launch: the owner books the rider in their own app, then records the provider (Own rider,
  Lalamove, Grab, Other), the tracking link (Lalamove and Grab links must be on their own hosts) and an optional rider
  name and phone. The customer sees "Track your delivery". The Lalamove API is after launch.
- SF-10: The receipt keeps its QR of the receipt link, save and share, and the Messenger hand-off. No WhatsApp.
- SF-11: `order_messages` is the order thread. At launch only payment proofs and system lines are written; the
  `payments` table stays the source of truth for money. Free-text chat comes later on the same table.
- SF-12: Reviews: a private 1 to 5 rating with an optional comment per completed order, seen by the owner, plus a
  "Review us on Google" button when the owner sets a link. No review markup, no public stars, no rewards for reviews.
- SF-13: PWA: per-shop icons from the logo with `next/og` (192, 512, maskable, apple-touch 180); Android splash from
  the manifest; an in-app splash (at most 600 ms, standalone mode, once per session) for iOS; a hand-written service
  worker for the offline page and push that never caches orders, prices or API answers.
- SF-14: Push at launch is transactional only: order status to customers who tapped "Notify me" (iOS only when
  installed). Marketing messages need a separate unticked opt-in per channel, stored in `consents`; none are offered
  until campaign sending is built (after launch).
- SF-15: Push path: an order status change queues `notification_outbox` rows; when the Vault secrets exist, pg_net
  calls the storefront's dispatch route, which sends with VAPID and removes dead subscriptions.
- SF-16: The dispatch route reads the outbox through secret-checked SQL functions; no service-role key is stored on
  Vercel.
- SF-17: Pasted image links are fetched on the server (https, no private addresses, image type checked by its bytes,
  2 MB, 8 s) and stored in Storage; never hotlinked. `images.remotePatterns` is only the Supabase host and
  `i.ytimg.com`. YouTube slides use a facade that loads the `youtube-nocookie.com` player on tap.
- SF-18: Demo photos are Pexels photos re-hosted in Storage with `supabase/demo-media/CREDITS.md`, only for the two
  demo shops, set by the demo SQL functions. No Unsplash re-hosting, no demo data in app code.
- SF-19: SEO: per-shop Open Graph image, `LocalBusiness` JSON-LD without ratings, a sitemap of active shops,
  canonical URLs.
- SF-20: Shop pages are cached per shop (tag `shop:<slug>`) and refreshed when the owner saves; `quote_order` still
  re-checks prices and stock at checkout. Replaces `force-dynamic`.
- SF-21: No NestJS for the storefront. It stays on Supabase (reads, SQL functions, Realtime); the few server needs
  (push dispatch, image import, cache refresh) are Next.js route handlers on Vercel with logic in `packages/api`.
  NestJS arrives with Product B; `packages/api` is the seam that makes the later move cheap.
- SF-22: Storefront v2 migrations are additive and backward compatible (new nullable or defaulted columns, new tables,
  functions that only add output keys), because a merge into `dev` deploys them to the live database.
- SF-23: Each shop has a privacy page (`/[shop]/privacy`) in SF1, linked from checkout, account and the home footer.
- SF-24: After launch (backlog in `docs/PROGRESS.md`): SMS, Lalamove API, owner campaign sending, Apple and Google
  Wallet passes, subdomains per shop, Google reviews shown on the storefront, free-text order chat, maps and address
  search, staff QR stamp scanning, extra reward rules (halfway, birthday, daily caps), menu precaching.
