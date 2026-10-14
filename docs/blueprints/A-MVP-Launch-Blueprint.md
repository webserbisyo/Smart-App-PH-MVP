# Smart App PH: MVP Launch Blueprint (Blueprint A)

Version 1.0 · 2026-10-14 (Asia/Manila) · Founder: Juan Miguel Morales (GitHub: webserbisyo) · Prepared by Claude

This blueprint covers the live MVP only: finishing and polishing every front-end page, one page per prompt, to TindaTrack-level UI and UX, then launching. The full product on NestJS is in Blueprint B. The two blueprints share one workflow (section 7) and one rule: nothing in Blueprint B may touch the live MVP.

Sources checked for this blueprint: the live repo `webserbisyo/smart-app-ph-mvp` (branch `dev` at `b53a7e7`, PR #21, and `main` at `c741494`), its `docs/` folder, the TindaTrack repo, the Master Blueprint 2.0, `DATABASE-SNAPSHOT.md`, the older planning docs, and the notes in the shared project folder (`plans/antigravity-workflow-proposal.md`, `plans/p4-ux-plan.md`, `prompts/README.md`).

---

## 1. What the MVP is

Smart App PH gives a small Philippine shop (food or retail) its own installable ordering app for customers and an owner dashboard. The launch promise: customers order and pay by GCash, Maya, bank or cash; the owner verifies payments, moves orders to done, and grows a members list with a stamp card. No commission. Price at launch: ₱599 per month per shop (decision D9).

### 1.1 In scope (launch version)

| Area | What ships |
| --- | --- |
| Storefront (customers) | Shop home, menu with search, item sheet, cart, one-page checkout, live receipt with proof upload, my orders, member account with stamp card, install prompt |
| Order types | Walk-in, pickup (as soon as possible, or a time today or tomorrow), delivery (flat zones or fee by Messenger). Each is an owner switch (decision B4) |
| Payments | Cash at the counter or on pickup, cash on delivery (switch), GCash, Maya, bank transfer with proof and reference number. A screenshot never marks an order paid |
| Members | Guest checkout by default, join with a 6-digit email code after an order, one welcome stamp (P4-F4), stamps on completed paid orders, peso reward at checkout (P4-31) |
| Dashboard (owner) | Home, Orders board and detail with chime, Products and Categories, Customers, Reports (today, 7 days, 30 days, CSV), Settings (look, info, hours, order types, payments, stamps) |
| Platform (founder) | Owner sign-up creates a pending shop. The founder approves, suspends and records subscription payments with SQL (decision D2, system paper Appendix A) |

### 1.2 Out of scope (goes to Blueprint B)

POS and cash shifts, kitchen and packing display, staff accounts and roles, promotions and vouchers, dine-in table QR, shipping, advance orders with a calendar, push notifications and announcements, full reports and Google Sheets, admin screen and billing automation, theme editor, custom domains, PayMongo, Meta Pixel, the native app.

### 1.3 Current stack (from the repo, not from memory)

| Part | What and version |
| --- | --- |
| Monorepo | Turborepo 2.11.7, pnpm 10.28.0, Node 24, TypeScript 6.0.3 |
| Storefront | Next.js 16.4.0 App Router (`apps/storefront`, `proxy.ts`, async params), Vercel region `sin1` |
| Dashboard | Vite 8.3.4, React 19, TanStack Router 1.170.42 (code-based) and Query 5.104.2 (`apps/dashboard`) |
| Shared | `packages/ui` (shadcn on Base UI, ReUI, DiceUI, Tabler icons, motion, 30 patterns), `packages/core` (Zod 4.6.6 rules, money, time, words), `packages/api` (the only place that talks to Supabase) |
| Backend | Supabase: Postgres with RLS, security-definer RPCs, `private` helpers, pg_cron, Realtime Broadcast from triggers, Storage (`shop-media` public, `payment-proofs` private), Auth with 6-digit codes; supabase-js 2.117.3, CLI 2.120.0 |
| Email | Resend SMTP from `codes@mail.webserbisyo.com` (domain on Vercel DNS, Resend region Tokyo) |
| CI | `.github/workflows/check.yml` (check, build, local DB tests with pgTAP, types diff) and `db-deploy.yml` (migrations to the hosted project on push to `dev`) |

Note: the Master Blueprint 2.0 lists pnpm 12.8.1, next 16.3.8 and vite 8.3.2. The repo's `package.json` and `docs/stack-versions.md` win.

---

## 2. What is built (with evidence)

### 2.1 Database (10 migrations, 26 tables)

Migrations in `supabase/migrations/`: `20261011230000_shops_and_owners`, `20261012010000_settings_and_catalog`, `20261012030000_storefront_read`, `20261012030100_demo_tools`, `20261012040000_orders`, `20261012050000_owner_orders`, `20261012060000_members_and_stamps`, `20261013010000_home_and_reports`, `20261013010100_demo_reset`, `20261013020000_sales_report_paid_orders`.

Tables: tenants, profiles, tenant_members, shop_settings, business_hours, closures, payment_accounts, delivery_zones, categories, items, item_photos, item_variants, option_groups, options, item_option_groups, customers, consents, customer_addresses, orders, order_items, order_events, order_counters, payments, loyalty_rules, loyalty_ledger, audit_log.

Public functions: create_my_shop, slug_available, save_item, save_sort_order, set_stock, get_storefront, quote_order, place_order, submit_payment_proof, get_order, review_payment, record_payment, advance_order, cancel_order, join_as_member, get_my_account, get_dashboard_today, get_member_insights, get_sales_report. Cron: `expire-unpaid-orders` every minute. pgTAP tests: `supabase/tests/database/01` to `07`.

### 2.2 Storefront routes (`apps/storefront/src/app`)

| Route | File | Main parts |
| --- | --- | --- |
| `/` | `app/page.tsx` | hint text only |
| `/[shop]` | `[shop]/page.tsx` | ShopHeader, BestSellers, CategoryChips, InstallCard |
| `/[shop]/menu` | `[shop]/menu/page.tsx` | CatalogBrowser, ItemCard, ItemSheet (client) |
| Cart | `features/cart/CartSheet.tsx` | a sheet, no `/cart` route |
| `/[shop]/checkout` | `[shop]/checkout/page.tsx` | Checkout, TransferAccounts, privacy consent checkbox |
| `/[shop]/o/[token]` | `[shop]/o/[token]/page.tsx` | Receipt, ProofUpload, ReceiptStamps, live status |
| `/[shop]/orders` | `[shop]/orders/page.tsx` | MyOrders |
| `/[shop]/account` | `[shop]/account/page.tsx` | AccountSignIn, MemberCard, StampHistory, SavedAddresses, JoinSheet |
| Manifest | `[shop]/manifest.webmanifest/route.ts` | per-shop install file |

### 2.3 Dashboard routes (`apps/dashboard/src`)

Outside the shell: `/login`, `/signup`, `/forgot-password`, `/setup`, `/pending`, `/suspended` (`features/auth/screens`). Inside the shell (`app/router.tsx`): `/` (redirects to home), `/kit`, and module pages through a splat route: home, orders and `orders/$orderId`, products, `products/categories`, `products/new`, `products/$itemId`, customers, reports, settings and its sections look, info, hours, order-types, payments, stamps.

### 2.4 Shared building blocks

`packages/ui/src/patterns`: AppShell, BottomDock, CartBar, CategoryIcon, CodeInput, CopyButton, EmptyPage, Money, MoreMenu, OfflineBanner, OrderCard, OrderLines, OrderTimeline, PageBody, PesoField, PhoneField, PhotoField, ProductCard, QuantityStepper, QueryState, SalesBars, SettingsSection, ShareShop, ShopHeader, StampCard, StatusBadge, StickyActionBar, StoreTabBar, TopBar. Motion tokens already exist in `packages/ui/src/styles/tokens.css`: `--duration-fast` 120 ms, `--duration-base` 200 ms, `--duration-slow` 300 ms, exits 90, 150 and 225 ms, `--ease-out-soft` cubic-bezier(0.2, 0, 0, 1).

---

## 3. Honest gaps and bugs

Each item has the evidence and the fix. Items marked **Launch blocker** must be done before the first paying shop.

| # | Gap or bug | Evidence | Fix | Priority |
| --- | --- | --- | --- | --- |
| G1 | Every branch and every preview uses the live database. A merged migration goes straight to live data, and testing on a preview writes real rows. | `db-deploy.yml` runs on push to `dev` against one `SUPABASE_PROJECT_REF`; `docs/deploy.md` says Preview and Production use the same Supabase URL and key | Staging Supabase project (section 7.6) | **Launch blocker**, do first |
| G2 | `main` is far behind `dev`. Vercel's Production Branch is `main`, so the production deployment shows the state of PR #2 (Resend, 2026-10-12). | `main` at `c741494`, `dev` at `b53a7e7`, about 565 files apart | First release PR `dev` into `main` after staging tests, tag `v0.6.0` | **Launch blocker** |
| G3 | Storefront is rendered on every request and reads the database each time. | `apps/storefront/src/app/[shop]/layout.tsx` line 17 and the manifest route: `export const dynamic = 'force-dynamic'` | Page A12 (cache shop data, revalidate on owner save) | High |
| G4 | No styled 404, error or loading pages in the storefront. | No `not-found.tsx`, `error.tsx` or `loading.tsx` under `apps/storefront/src/app` | Page A1 | High |
| G5 | No privacy notice page. The checkout consent line has no link to one. | No `[shop]/privacy`; `packages/core/src/words.ts` line 114 is the consent text only | Page A10 | **Launch blocker** (Data Privacy Act) |
| G6 | No offline page and no service worker. Per-shop icons are only the logo plus two platform PNGs; no apple-touch-icon. | `apps/storefront/public/icons` has only `icon-192.png` and `icon-512.png`; decision P5-21 moved per-shop icons to P6 | Page A11 | High (acceptance test 10) |
| G7 | Dashboard is not installable and has no favicon. | `apps/dashboard/index.html` has no manifest or icon link; there is no `apps/dashboard/public` | Page D15 | Medium (P6 item) |
| G8 | The component test page `/kit` is open to every signed-in owner in production. | `apps/dashboard/src/app/router.tsx` line 90 | Show only when `import.meta.env.DEV` (in A0.3) | Medium |
| G9 | The dashboard reads the session and the shop once and never again (`staleTime: 'static'`). An approved shop stays on "Waiting" and a suspended shop keeps working until a reload. PR #21 fixed only the setup case. | `apps/dashboard/src/app/router.tsx` lines 58 and 59 | Pending screen re-checks every 30 s and on focus; shell re-checks shop status on focus (in D0b and D1) | High |
| G10 | No screen render tests. The 12 test files in `apps/` test logic only, and no testing library is installed. | `find apps -name '*.test.ts*'`; no `@testing-library/*` in any `package.json` | A0.3 (needs your approval for 2 dev packages) | High |
| G11 | No owner account page (change password, email, sign out everywhere). | No account route in `router.tsx` | Page D14 | Medium |
| G12 | No new-order email to the owner. The system paper's own risk table (section 14) relies on it "right after launch". | No email trigger in migrations | Blueprint B, notifications module; before then the chime and Messenger | Medium |
| G13 | Cloudflare Turnstile and 30-day proof deletion were moved to P6 (P5-6, P5-15). | `docs/decisions.md` | See section 6.2: Turnstile only if abuse appears; proof deletion within 30 days of launch | Medium |
| G14 | Docs still name the founder "Alex". | `docs/system-paper.md` line 5; Master Blueprint header | Docs PR in A0.1 | Low, but fix |
| G15 | The prompt template in `docs/build-plan.md` ends with "push to dev". That now breaks the rule that agents never push to `dev`. | `docs/build-plan.md`, "Prompt template" | Replace with the template in section 7.4 (A0.1) | Medium |
| G16 | Supabase region is not written anywhere in the docs. Railway (Blueprint B) and staging must match it. | grep of `docs/` | Write it in `docs/deploy.md` (A0.1) | Low |
| G17 | Two prices are in circulation: ₱599 (repo, D9) and ₱799 (Master Blueprint). | `docs/decisions.md` D9; Master Blueprint section 1 | Founder picks one before the terms page (open question Q1) | **Launch blocker** for terms |

---

## 4. The quality bar (applies to every page prompt)

This is the TindaTrack bar, translated to our tokens. Every page prompt links to this section instead of repeating it.

### 4.1 Sizes and screenshots

- Check at 360, 390, 768, 1024 and 1280 px (dashboard also 1536). No sideways scroll at any width.
- Attach screenshots to the PR at **390 px (phone)** and **1280 px (desktop)**, light mode; dashboard also dark mode at 1280. Board-type pages also at 768.
- Test with both demo shops: `juans-cafe` (food words) and `tala-apparel` (retail words).

### 4.2 States (all of them, every page)

Loading (skeleton in the content's shape, shell stays), empty (Fluent icon, one line, one action), error (what failed plus Try again), offline (`OfflineBanner`, network actions disabled with the reason), closed or paused shop (storefront), long names (one line with ellipsis in cards), big numbers (₱12,345.50 fits), keyboard open (action bar above it, dock hidden), dashboard dark mode.

### 4.3 Look

- Colours only from `tokens.css`. No hex in components. Storefront uses `--shop-60`, `--shop-30`, `--shop-10` (decision P2-7); status colours never follow shop colours.
- One filled main button per screen (shop 10% colour on the storefront, `--primary` on the dashboard).
- Status is always icon plus word plus colour, from `STATUS_TONE` in core.
- Text contrast at least 4.5:1 (AA). Visible focus ring on every control.
- Touch targets at least 44 px; inputs at least 16 px text (stops iPhone zoom).
- Plus Jakarta Sans for text, tabular numbers for money; ₱ via `Money` / `formatPeso`.
- Every visible word in `words.ts`; Menu or Products, Kitchen or Packing from vocab.

### 4.4 Motion (exact)

| Moment | Spec |
| --- | --- |
| Page enter | fade plus 8 px rise, `--duration-base` 200 ms, `--ease-out-soft` |
| Lists and grids | same as page enter, 40 ms stagger, first 6 items only |
| Sheets and dialogs | slide or scale in at `--duration-slow` 300 ms, out at 225 ms |
| Buttons and chips | colour and shadow at `--duration-fast` 120 ms |
| Cart bar bump on add | spring, stiffness 400, damping 30, scale 1 to 1.06 to 1 |
| Order placed and reward reached | one celebration each (confetti only on reward, P4 plan section 3.5) |
| Number ticker | Home "Sales today" only |
| Reduced motion | `prefers-reduced-motion`: opacity only, no movement, no confetti |
| Ceiling | nothing longer than 400 ms |

### 4.5 Speed

- No layout shift: images through `next/image` with `sizes` and fixed aspect ratios; skeletons match final size (CLS under 0.1).
- Storefront first-load JavaScript budget 200 kB gzipped per page (blueprint v2 budget). Measure in A12.
- Dashboard routes load per screen; charts lazy-loaded.

### 4.6 Done when (every page)

1. `pnpm check` and `pnpm build` green.
2. 0 console errors and 0 React warnings on the page (open DevTools Console).
3. Every state in 4.2 seen in the browser; screenshots attached.
4. The page's own "Done when" list tested by Antigravity in its browser, then by you on a phone.
5. `docs/PROGRESS.md` ticked (2 log lines max) and a `docs/CHANGELOG.md` line.

---

## 5. Page-by-page plan, in build order

One prompt per row. A prompt ID is also the branch name: `ag/a2-shop-home`. Customer pages come first because they were never polished in the first build (checkpoints 24 to 27 were cancelled) and they are what shops show their customers.

Effort: S is about one Antigravity session, M is one to two, L may need an a/b split.

### Stage 0: set up the way of working (before any page)

**A0.1 Rules and docs PR** (S). Add `AGENTS.md` (section 7.2), shrink `CLAUDE.md` to point to it, add `docs/PROGRESS.md`, `docs/CHANGELOG.md` (backfill v0.5.0 from PR titles), `.github/pull_request_template.md`, rewrite `README.md` (no passwords), replace the build-plan prompt template (G15), fix "Alex" (G14), write the Supabase region in `docs/deploy.md` (G16), add decisions A-1 to A-6 (section 9) to `docs/decisions.md` once you approve them.

**A0.2 Staging database** (S, mostly by hand). You follow section 8, steps M1 to M4. The prompt changes `db-deploy.yml` so `dev` deploys to staging and `main` to production (section 7.6).

**A0.3 Test harness and small fixes** (S). Add route smoke tests (each storefront page and each dashboard screen renders with real data shapes without throwing; fails on any console error). Needs `@testing-library/react` and `happy-dom` as dev packages: your approval, recorded as decision A-3. Hide `/kit` outside dev (G8).

### Stage 1: storefront (customer app)

**A1 Shop shell and system pages** (M). Files: `[shop]/layout.tsx`, `features/shell/*`, new `not-found.tsx`, `error.tsx`, `loading.tsx` at app and `[shop]` level.
- Goal: every storefront page sits in one polished frame; bad links and errors look designed.
- Parts: StoreTabBar (Home, Menu, Orders, Account) with active state, CartBar, ShopTheme, OfflineBanner, desktop top nav.
- States: unknown shop (friendly 404 with "Check the link" and no shop colours), pending or suspended shop ("This shop isn't open yet"), server error with Try again, route loading skeleton.
- Done when: `/juans-cafe/xyz` and `/no-such-shop` show the designed 404; killing the network shows the offline banner; tab bar active state is right on every page.

**A2 Shop home `/[shop]`** (M). Files: `[shop]/page.tsx`, `features/catalog/BestSellers.tsx`, `CategoryChips.tsx`, `features/install/InstallCard.tsx`, ShopHeader.
- Goal: in 3 seconds a customer knows the shop, whether it is open, and where to tap to order.
- Parts (top to bottom): ShopHeader (logo, name, "Open · until 9 PM" or "Closed · opens 7 AM tomorrow"), 16:9 cover, members line (only when the owner turned it on), category chips with icons, Best sellers scroller, Messenger button (outline, when set), tab bar and cart bar.
- States: closed shop alert with Add buttons disabled and the reason, paused orders, no cover (30% colour block), no best sellers yet (section hidden), long shop name.
- Motion: cover and header fade in; best sellers stagger.
- Done when: both demo shops look right in 360 and 1280; closed state shown by setting hours in Settings.

**A3 Menu `/[shop]/menu`** (M). Files: `[shop]/menu/page.tsx`, `CatalogBrowser.tsx`, `ItemCard.tsx`.
- Goal: find and add an item in under 3 taps (GrabFood pattern).
- Parts: sticky search, sticky category chips that follow scroll (scroll spy), 2-column ProductCard grid (3 to 4 on desktop), "from ₱120" when variants differ, round "+" button, Sold out badge.
- States: no match ("No match for 'latte'" plus Clear), empty category hidden, item without photo (category icon on the 30% colour), all sold out.
- Motion: "+" adds directly when there is one variant and no required add-ons, with the cart bar bump and a "Added" toast.
- Done when: tapping a chip scrolls to its section; scrolling highlights the chip; quick add works for a simple item.

**A4 Item sheet** (M). File: `features/catalog/ItemSheet.tsx`.
- Goal: choose options without mistakes.
- Parts: photo scroller, name, description, variant radio (required), add-on groups ("up to N"), note (120 characters), StickyActionBar with QuantityStepper and "Add · ₱150" live total.
- States: required group not chosen (button says "Choose a size" and scrolls to it), sold-out variant shown disabled, long description, phone keyboard open on the note.
- Done when: bottom sheet on phone, centred dialog on desktop; swipe down closes; the total always matches the cart line.

**A5 Cart sheet and cart bar** (S). Files: `features/cart/CartSheet.tsx`, `cart-store.ts`, CartBar.
- Parts: OrderLines with QuantityStepper and a small remove icon, item notes, subtotal, member stamp line ("2 more orders to a reward" or the reward switch), "Checkout · ₱345".
- States: empty cart (shopping bag icon, "Your cart is empty", See the menu), item now sold out (line warning), reload keeps the cart, right drawer on desktop.
- Done when: cart survives reload; removing the last item shows the empty state; bump animation on every add.

**A6 Checkout `/[shop]/checkout`** (L, split a: How and Who, b: Pay and place).
- Goal: place an order on a phone in under a minute, with no double orders.
- Parts: How (order types the shop turned on; pickup time slots; delivery address, landmark, zone with fee), Who (name, PhoneField, optional email, Remember me), Pay (method cards; transfer shows account name and number with CopyButton, QR tap-to-enlarge, "Send exactly ₱345"), totals from `quote_order`, consent line **with a link to the privacy page (A10)**, Place order.
- States: line problems from the re-quote ("Large is sold out now" plus Remove, button disabled), offline (button says "You're offline"), placing (spinner, button disabled, idempotent client key), shop just closed, member prefilled, reward applied.
- Done when: walk-in cash and pickup GCash orders both work; double tap creates one order; a sold-out change during checkout is caught.

**A7 Receipt `/[shop]/o/[token]`** (L, split a: placed moment and live status, b: proof upload).
- Goal: the customer knows exactly what happens next, and the payment proof goes in on the first try.
- Parts: "Order placed!" moment with `#042` big and the type-specific line, receipt QR, horizontal OrderTimeline (live), PaymentBadge, "Upload proof" card (PhotoField with progress, reference number, Submit), OrderLines and total, "Send order to our Messenger", "Copy order details", "Save receipt", ReceiptStamps with the join nudge, install prompt card after the first order.
- States: waiting for proof, checking payment, rejected (reason plus upload again), paid, cancelled or expired (reason shown), realtime dropped (15 s polling), upload failed (retry).
- Motion: the timeline step animates on a live change.
- Done when: an owner's step on the dashboard shows on the receipt within 2 seconds; a rejected proof can be re-sent.

**A8 My orders `/[shop]/orders`** (S). File: `features/orders/MyOrders.tsx`.
- Parts: list rows with `#042`, date, total, status badge; guest list from this phone, member list from the account.
- States: no orders ("No orders yet" plus See the menu), guest with orders on another phone (hint to join), loading.

**A9 Account and member card `/[shop]/account`** (M). Files: `features/members/*`, `features/account/*`.
- Parts: signed out: join explainer with the shop's rule and email plus 6-digit code; signed in: StampCard (member green), reward-ready state with confetti once, StampHistory, SavedAddresses, Sign out, Install this app.
- States: wrong code, code expired (resend timer), stamp card off in this shop, reward ready, many stamps (card wraps).
- Done when: join, earn a stamp, see the welcome stamp; confetti only once per reward.

**A10 Privacy notice `/[shop]/privacy`** (S, new page). Ported in spirit from the old repo's `apps/storefront/src/app/[slug]/privacy/page.tsx`.
- Content: who keeps the data (the shop), what is kept (name, mobile, optional email, address, orders, proofs for 30 days), why, how long, how to ask for a copy or deletion (the shop's contact, and the platform email), Smart App PH as the service provider. Plain English plus a short Filipino summary.
- Linked from: the checkout consent line, the account page footer, the shop home footer.
- Done when: every shop has it; checkout links to it. Your review of the wording is required (section 8, M12).

**A11 Install and offline** (M, split a: icons and manifest, b: offline page and install guide).
- a: per-shop icons generated from the logo with `next/og` (built into Next, no new package): 192, 512, maskable 512, apple-touch-icon 180. Manifest uses them; fallback to the platform icons when there is no logo.
- b: a small hand-written service worker (no library) that only serves an offline page when navigation fails; it never caches orders or prices. Install guide sheet with iPhone steps (Share, Add to Home Screen) and Android's browser prompt.
- Done when: acceptance test 10 passes on a real Android phone and iPhone; airplane mode shows the offline page with the shop name.

**A12 Storefront speed pass** (M).
- Replace `force-dynamic` with cached shop data per slug (Next 16 caching with a cache tag per shop), plus on-demand refresh: after an owner saves in the dashboard, `packages/api` calls a storefront route that checks the owner's login and refreshes that shop's tag. Stock and prices stay safe because `quote_order` re-checks at checkout.
- Measure and cut client JavaScript to the 200 kB budget (move what can be server components; lazy-load sheets).
- Done when: Lighthouse mobile Performance 90 or more on `/juans-cafe` and `/juans-cafe/menu`; acceptance test 2 still passes ("appears within seconds").

### Stage 2: dashboard (owner app)

**D0a Login, sign up, forgot password** (M). Files: `features/auth/screens/LoginScreen.tsx`, `SignUpScreen.tsx`, `ForgotPasswordScreen.tsx`.
- Parts: narrow centred card (480 px), CodeInput for 6-digit codes, password show/hide, "Step 1 of 3" text on sign-up.
- States: wrong password, unconfirmed email (send code again with a 60 s timer), code wrong or expired, slow network.

**D0b Setup, Waiting, Suspended** (S). Files: `SetupScreen.tsx`, `PendingScreen.tsx`, `SuspendedScreen.tsx`.
- Fix G9: Waiting re-checks the shop status every 30 s and on window focus, then moves to Home with a short celebration.
- Suspended explains how to pay and whom to message.

**D1 App shell** (M). Files: `app/shell/*`, `packages/ui` AppShell, BottomDock, TopBar.
- Parts: sidebar (desktop), rail (tablet), dock (phone, no raised button, UI-2), top bar with breadcrumbs on desktop, shop status chip, "Turn on order sound" chip until enabled, open-orders count in the nav and tab title "(2) Orders · Juan's Cafe", theme switch, offline banner.
- Fix G9 for the shell: re-check shop status on focus; a suspended shop is sent to `/suspended`.

**D2 Orders board `orders`** (L). File: `features/orders/screens/OrdersScreen.tsx`.
- Phone tabs (New, Preparing, Ready, Out, Done today with counts), 2 to 3 columns on tablet, 4 to 5 on laptop, side panel detail at 1280 and up.
- OrderCard: number, type icon, age (amber at 10 min, red at 20), name and Member badge, items line, total and PaymentBadge, one next-step button from `nextActions()`, More menu (Cancel, Print slip, Call, Message).
- States: empty column (quiet text), realtime off (banner plus Refresh), optimistic step reverted with the reason, cancel needs a reason.
- Done when: a new storefront order chimes and appears without refresh; every open order can be finished from the board.

**D3 Order detail `orders/$orderId`** (M). File: `OrderDetailScreen.tsx`.
- Parts: header, customer card with Call and Message, address and landmark, OrderLines, payment card (proof zoom, reference with copy, "Check this reference in your own GCash app", Approve, Reject with reason), vertical timeline, StickyActionBar, print slip layout "ORDER SLIP · NOT AN OFFICIAL RECEIPT".
- States: no proof yet, duplicate reference blocked (message), cancelled or expired, tracking link on Out for delivery.

**D4 Home** (M). File: `features/home/screens/HomeScreen.tsx`.
- Parts: greeting and Share shop, setup checklist with progress (until done), attention chips (to verify, waiting, low stock), 4 stat cards (Sales today with number ticker, Orders with "3 open", Average order, New members this week), members card (member green, top 3 suki), In progress (5 compact OrderCards), Best sellers today.
- No % comparisons (UX-8). Midnight test: an empty new day must look calm, not broken.

**D5 Products list `products`** (M). File: `ProductsScreen.tsx`.
- Grouped by category, row with photo or icon, name, price range, stock ("3 left" amber), inline Visible and Sold out switches (optimistic), search, Add product.

**D6 Product editor `products/new` and `products/$itemId`** (L, split a: basics and photos, b: variants, stock and add-ons). File: `ProductEditorScreen.tsx`.
- Leave guard on unsaved changes (`LeaveGuard.tsx` exists); Archive instead of Delete when the item has orders.

**D7 Categories `products/categories`** (S). File: `CategoriesScreen.tsx`. Sortable list, icon picker, hidden switch.

**D8 Settings hub and Shop look** (M). Files: `SettingsScreen.tsx`, `LookScreen.tsx`. Live phone preview, 60/30/10 presets, contrast warning under 4.5:1.

**D9 Business info and Hours** (S). Files: `InfoScreen.tsx`, `HoursScreen.tsx`. Messenger "Test link", closed days calendar, Pause orders now.

**D10 Order types and Payments** (M). Files: `OrderTypesScreen.tsx`, `PaymentsScreen.tsx`. Delivery zones, pay-later rules, sortable accounts with QR.

**D11 Stamp card** (S). File: `StampsScreen.tsx`. On switch, rule fields, live StampCard preview.

**D12 Customers** (M). File: `CustomersScreen.tsx`. Data grid on desktop, rows on phone, Members only toggle, CSV, customer sheet with orders and stamps.

**D13 Reports** (M). File: `ReportsScreen.tsx`. Today, 7 days, 30 days; stat totals; lazy bar chart with tooltips and a screen-reader summary; best sellers; CSV.

**D14 Owner account** (S, new screen). Profile name, email (read-only), change password with the 6-digit code, sign out of all devices, "Delete my account" as a request to the founder (no self-delete at launch). Recommended, not required.

**D15 Dashboard installable** (S). `apps/dashboard/public/manifest.webmanifest`, icons, favicon, theme colour, minimal offline page. P6 item "dashboard installable until the native app exists".

### Stage 3: launch prompts

**L1 Pre-launch audit** (M). Antigravity writes `docs/AUDIT-p6.md` (ID, severity, file and line, problem, fix) after walking every page at 390 and 1280 with both shops. Claude reviews it.

**L2 Fix rounds** (one prompt per 5 to 8 audit IDs).

**L3 Production setup** (by hand, section 8, M5 to M11).

**L4 Acceptance run**: the ten tests in `docs/system-paper.md` section 13 on production, on a real phone, with a test shop.

### 5.1 How many prompts, and what fits

About 32 prompts in total (some split). At a realistic 2 to 3 merged prompts per day, Stage 0 plus Stage 1 plus D0 to D4 fit in the first 10 days of Antigravity. D5 to D15 and the launch prompts take the rest. Since Blueprint B also wants Antigravity time, the honest plan is in section 10.

---

## 6. P6 launch checklist

### 6.1 Must be done before the first paying shop

| # | Item | Who |
| --- | --- | --- |
| 1 | Staging project live; `dev` deploys to staging, `main` to production | You (M1 to M4) plus prompt A0.2 |
| 2 | Branch rules on `main` and `dev` (PR required, CI must pass, no force push) | You (M3) |
| 3 | Stage 1 storefront pages A1 to A11 merged | Antigravity |
| 4 | Dashboard D0 to D4 merged (auth, shell, orders, detail, home) | Antigravity |
| 5 | Privacy page live and linked from checkout; wording approved | Antigravity plus you |
| 6 | Terms for shops written with the final price (Q1) | Claude drafts, you approve |
| 7 | Supabase Pro on the production project, daily backups on | You (M5) |
| 8 | Vercel Pro (commercial use is not allowed on Hobby) | You (M6) |
| 9 | Domains: `shop.webserbisyo.com` to the storefront project, `app.webserbisyo.com` to the dashboard project (decision P2-5) | You (M7) |
| 10 | Supabase Auth Site URL set to `https://app.webserbisyo.com` | You (M8) |
| 11 | Release `dev` into `main`, tag `v0.6.0` | You (M9) |
| 12 | Check that every table and function has explicit grants. Supabase stops exposing new objects automatically from 2026-10-30 (`docs/stack-updates.md`); our migrations already grant explicitly, but verify on production | Claude review |
| 13 | Ten acceptance tests pass on production | You plus Antigravity |
| 14 | First shop onboarded, approved by SQL, shop QR printed | You (M10) |

### 6.2 Can follow within 30 days of launch

| Item | Note |
| --- | --- |
| Delete payment proofs after 30 days (P5-15) | The first proofs only turn 30 days old a month after launch. Build as a scheduled job (Edge Function now, or the NestJS jobs module in Blueprint B) |
| Cloudflare Turnstile (P5-6) | I recommend waiting: the database already limits unpaid orders per phone and per shop. A real Turnstile check needs a server step before `place_order`; that fits naturally in the NestJS checkout endpoint. Add it at once if fake orders appear |
| New-order email to the owner | Blueprint B notifications module |
| Dashboard installable (D15), owner account (D14) | If not done before launch |
| Uptime check and usage alerts | Supabase usage alerts and a free uptime monitor on `/juans-cafe` |

### 6.3 Watch on launch day

Orders arrive on the board with the chime; proofs upload; receipts update live; no errors in Vercel logs (Project, Logs) or Supabase logs (Logs and Analytics); email codes arrive within a minute.

---

## 7. Workflow (shared with Blueprint B)

### 7.1 Who does what

| Who | Does |
| --- | --- |
| Claude (this project) | Engineers the context and writes one prompt file at a time (`docs/prompts/A2-shop-home.md`), reviews each PR (diff, CI, screenshots), writes approved decisions into `docs/decisions.md` |
| Antigravity (your laptop) | Reads `AGENTS.md` and the prompt, makes the branch, codes in small commits, runs the checks, opens the app in its browser, takes screenshots, updates `PROGRESS.md` and `CHANGELOG.md`, pushes the branch, opens the PR into `dev` |
| You | Paste one line into Antigravity, approve its plan, paste the PR link to Claude, test on your phone, click Merge when CI is green and Claude says OK |

Your line to Antigravity: `Read @AGENTS.md and @docs/prompts/A2-shop-home.md and do exactly that prompt.`
Your line to Claude: `Review PR #NN.`

### 7.2 AGENTS.md (the rules every agent reads)

The draft in `plans/antigravity-workflow-proposal.md` section 7 is good. Use it with these changes:

1. Branch names: `ag/<prompt-id>-<short-name>` for Antigravity (example `ag/a2-shop-home`), `claude/<prompt-id>-<short-name>` for Claude Code threads. Blueprint B work uses `ag/n<id>-...` and targets `next`, not `dev` (Blueprint B section 4).
2. Git, strict: start from the latest target branch; never push to `main`, `dev` or `next`; never merge; never force-push; never `reset --hard`; one commit per numbered step; open a PR with the template.
3. Database: a schema change is a new migration file only. Never run `supabase link`, `supabase db push` or any command against a hosted project. Never use the secret key. After a migration run `pnpm db:types` and commit the types.
4. UX: section 4 of this blueprint is the bar.
5. Verify: localhost URLs, both demo shops, screenshots at 390 and 1280, 0 console errors.
6. Stop and ask when: a new package seems needed, a lint rule would have to be weakened, a file has no clear place, the prompt is bigger than it looks.
7. Finish with 5 lines (what changed, how to test, what you decided, what is missing, what the founder must do by hand) and the PR link.

`CLAUDE.md` becomes one line, `@AGENTS.md`, so the two agents never read different rules (TindaTrack's lesson: its `backend/AGENTS.md` and `backend/CLAUDE.md` drifted apart).

### 7.3 Branches and PRs

```
main      production (Vercel Production, production database). Only release PRs from dev.
dev       integration (Vercel previews, staging database). Only PRs from ag/* and claude/*.
ag/a2-shop-home    one prompt, one branch, one PR into dev, deleted after merge.
next      Blueprint B integration branch (see Blueprint B).
```

TindaTrack merged branches locally into `main` with no PRs and no CI. We keep PRs and CI: with a database that deploys on merge, a local merge by an agent is how live data breaks.

### 7.4 Prompt template

```
# A2 Shop home
Read @AGENTS.md, @docs/blueprints/A-MVP-Launch-Blueprint.md sections 4 and 5 (A2),
and @docs/ux-plan.md section 5.1 first.

Goal: one sentence.
Branch: ag/a2-shop-home from the latest dev.
Build only: numbered steps, each one commit.
  1. ...
  2. ...
Do not build: anything nearby that is out of scope.
Files: exact paths to change or add.
Reuse: patterns and components by name.
Exact values: sizes, tokens, durations (no adjectives).
Wireframe: ASCII for phone and desktop when the layout changes.
States to show: from section 4.2, plus page-specific ones.
Done when (Antigravity checks in its browser, then the founder on a phone):
  - ...
Finish: pnpm check and pnpm build green; screenshots 390 and 1280 in the PR;
PROGRESS.md and CHANGELOG.md updated; push the branch; open a PR into dev;
reply with the 5 lines and the PR link.
```

### 7.5 PROGRESS.md and CHANGELOG.md

- `docs/PROGRESS.md`: a checklist of every prompt ID in this blueprint (A0.1 to L4) and Blueprint B (N0.1 onwards), then a log with at most 2 lines per prompt: what changed, gates passed, PR number. TindaTrack's was 939 lines; agents read it every time, so keep it short.
- `docs/CHANGELOG.md`: version per release (v0.5.0 for everything up to PR #21, v0.6.0 for the launch), one line per prompt under "Unreleased" until the release.
- Tag each release on `main` (section 8, M9).

### 7.6 Staging database: so branches cannot change the live database

Recommendation (decision A-1):

| Branch | Supabase project | Vercel | Migrations deployed by |
| --- | --- | --- | --- |
| `main` | Production (the current project) | Production | `db-deploy` on push to `main` |
| `dev` and every PR preview | **Staging** (new, Free plan, same region) | Preview | `db-deploy` on push to `dev` |
| Local laptop | Local Supabase in Docker (`supabase start`), optional | none | `supabase db reset` locally |

Workflow change for A0.2: `db-deploy.yml` triggers on push to `dev` and `main`, and picks the GitHub Environment by branch (`staging` for `dev`, `production` for `main`); each Environment holds its own `SUPABASE_PROJECT_REF` and `SUPABASE_DB_PASSWORD`. Keep the founder-only "Push Auth config" switch.

Staging needs its own demo shops: sign up two owners on a preview, approve them with the founder SQL, then run `demo_reset` for each. Put the staging project in a separate free Supabase organization so it costs US$0 (a project inside a Pro organization adds compute cost). A free project pauses after a week without use; you restore it with one click.

---

## 8. Steps you do by hand (click by click)

Screens change sometimes; if a button has moved, look for the same words nearby.

**M1. Create the staging Supabase project**
1. Go to supabase.com/dashboard and sign in.
2. Top left, open the organization menu, choose **New organization**, name it `Smart App PH Staging`, plan **Free**, click **Create organization**.
3. Click **New project**. Name: `smart-app-ph-staging`. Database password: click **Generate a password**, then copy it into your password manager. Region: the **same region as production** (open your production project, Project Settings, General, to see it; Singapore is expected). Click **Create new project** and wait about 2 minutes.
4. Open **Project Settings**, **General**, copy the **Project ID** (the reference). Open **Project Settings**, **API Keys**, copy the **Publishable key** and the **Project URL**. Keep these three values for M2 and M4.

**M2. GitHub Environments for the two databases**
1. On github.com open `webserbisyo/smart-app-ph-mvp`, click **Settings** (top tabs), then **Environments** (left).
2. Click **New environment**, name `staging`, click **Configure environment**.
3. Under **Environment secrets** click **Add environment secret**: name `SUPABASE_DB_PASSWORD`, value the staging password. Save.
4. Under **Environment variables** click **Add environment variable**: name `SUPABASE_PROJECT_REF`, value the staging Project ID. Save.
5. Go back to **Environments**, click **New environment**, name `production`, and add the same two names with the **production** values (the ones already under Settings, Secrets and variables, Actions).
6. Under `production`, tick **Required reviewers** and add yourself, so a production database deploy waits for your click.
7. Leave `SUPABASE_ACCESS_TOKEN` and `RESEND_API_KEY` as repository secrets; both environments can read them.
8. Note: Environments with their own secrets and required reviewers work on public repositories for free. On a **private** repository with a free personal plan they are not available. In that case the A0.2 prompt uses repository secrets with two names instead (`STAGING_SUPABASE_PROJECT_REF`, `PROD_SUPABASE_PROJECT_REF`, and the same for the password) and picks them by branch. Tell Claude which case you are in before A0.2 is written.

**M3. Protect `main` and `dev`**
1. Settings, **Rules**, **Rulesets**, **New ruleset**, **New branch ruleset**.
2. Name `protect main and dev`. Enforcement status **Active**.
3. Target branches: **Add target**, **Include by pattern**, type `main`; again for `dev`.
4. Tick **Restrict deletions**, **Require a pull request before merging**, **Require status checks to pass** (click **Add checks**, type `check`, pick it), **Block force pushes**. Click **Create**.
5. Note: rulesets on a **private** repository need a paid GitHub plan for personal accounts. If you make the repo private on the free plan, these rules will not be enforced and AGENTS.md is the only guard (open question Q4).

**M4. Point Vercel previews at staging**
1. vercel.com, open the **storefront** project, **Settings**, **Environment Variables**.
2. Find `NEXT_PUBLIC_SUPABASE_URL`. Click the three dots, **Edit**, untick **Preview**, Save. Do the same for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Click **Add New**: key `NEXT_PUBLIC_SUPABASE_URL`, value the staging URL, environment **Preview** only. Save. Same for the publishable key.
4. Repeat in the **dashboard** project with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
5. Open **Deployments**, find the newest `dev` deployment, three dots, **Redeploy**.

**M5. Supabase Pro and backups (launch week)**
Production project, **Organization settings**, **Billing**, **Change plan**, **Pro**. Then **Database**, **Backups** to confirm daily backups are listed.

**M6. Vercel Pro**
vercel.com, your team, **Settings**, **Billing**, **Upgrade to Pro**. One Pro seat covers both projects.

**M7. Domains**
1. Storefront project, **Settings**, **Domains**, **Add**, type `shop.webserbisyo.com`, choose Production. The domain is already on Vercel DNS, so it connects by itself.
2. Dashboard project, same steps with `app.webserbisyo.com`.
3. Do not touch `webserbisyo.com` or `www` (decision P2-5).

**M8. Supabase Auth URLs**
Production project, **Authentication**, **URL Configuration**. Site URL `https://app.webserbisyo.com`. Add `https://shop.webserbisyo.com/**` under Redirect URLs. Save.

**M9. Release and tag**
1. On GitHub, **Pull requests**, **New pull request**. Base `main`, compare `dev`. Title `Release v0.6.0`. **Create pull request**.
2. When the checks are green and Claude has reviewed it, click **Merge pull request**, then **Confirm merge**.
3. **Actions** tab: open `db-deploy`, click **Review deployments**, tick `production`, **Approve and deploy** (from M2 step 6).
4. **Releases** (right side of the repo home), **Draft a new release**, **Choose a tag**, type `v0.6.0`, **Create new tag**, target `main`, title `v0.6.0 Launch`, paste the CHANGELOG section, **Publish release**.

**M10. Approve a shop**
Supabase production project, **SQL Editor**, paste the approve snippet from `docs/system-paper.md` Appendix A (or `supabase/snippets/founder.sql`), change the slug, **Run**.

**M11. Antigravity on your laptop (once)**
Install Node 24, pnpm 10.28.0 (`corepack enable`), Git. Clone the repo, create `apps/storefront/.env.local` and `apps/dashboard/.env.local` from the `.env.example` files with the **staging** URL and publishable key. Never put the secret key there.

**M12. Review the privacy and terms wording**
Read the privacy page on a preview and the terms draft; reply "approved" or list changes.

---

## 9. Decisions to record in `docs/decisions.md` (after you approve)

| ID | Decision | Why |
| --- | --- | --- |
| A-1 | Staging Supabase project for `dev` and previews; production only from `main` | Feature branches and merges can no longer change live data |
| A-2 | Antigravity and Claude never push to `main`, `dev` or `next`; every change is a PR | A push to `dev` deploys migrations |
| A-3 | Add `@testing-library/react` and `happy-dom` as dev packages for render smoke tests | Catches pages that crash; the first build had about 1000 console errors on Home unnoticed |
| A-4 | Storefront caches shop data and refreshes on owner save | Speed on mobile data; replaces `force-dynamic` |
| A-5 | Turnstile waits for the NestJS checkout endpoint unless fake orders appear | Needs a server step before `place_order`; database limits cover launch |
| A-6 | Per-shop icons and the offline page without new packages (`next/og`, hand-written service worker) | No new dependencies for a small feature |

---

## 10. Sharing Antigravity's 2 weeks with Blueprint B

Antigravity Pro ends about 2026-10-28. Both blueprints compete for it. My recommendation:

| Days | Blueprint A (launch) | Blueprint B (NestJS) |
| --- | --- | --- |
| 1 to 2 | A0.1, A0.2, A0.3 | N0.1 (by hand, Blueprint B) |
| 3 to 8 | A1 to A12 (storefront) | N0.2 scaffold, N0.3 auth and tenancy |
| 9 to 12 | D0 to D4 | N0.4 Railway, N0.5 switch |
| 13 to 14 | L1 audit | M1 roles database prompt if time remains |
| After | D5 to D15, L2 to L4 in Claude Code threads | the modules, in Claude Code threads |

Launch work wins every conflict. Claude Code threads can run every prompt after Antigravity ends because `AGENTS.md` is the shared rulebook.

---

## 11. Open questions for you

| # | Question | My recommendation |
| --- | --- | --- |
| Q1 | Price on the terms page: ₱599 (repo, D9) or ₱799 (Master Blueprint)? | ₱599 for founding shops, written as "founding price"; raise for new shops once staff and POS ship in Blueprint B |
| Q2 | Create the staging project now? | Yes, before any new migration |
| Q3 | Approve the two test packages (A-3)? | Yes |
| Q4 | Make the repo private? | Only with a paid GitHub plan, or the branch rules stop working. If you stay on Free, keep it public; there are no secrets in the code |
| Q5 | Owner account page (D14) before launch? | After launch is fine |
| Q6 | Turnstile timing (A-5)? | With the NestJS checkout endpoint, unless abuse appears first |
