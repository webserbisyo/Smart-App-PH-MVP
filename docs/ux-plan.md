# P4 UX plan: every launch screen, built once

Research and plan for Phase 4, 2026-10-11. Sources: system paper v1.1 (4.1, 6, 9), build plan v1.1 (phase 4), `docs/ui-kit.md`, the P2 code on `dev`, the first build (`webserbisyo/Smart-App-PH`, branch `redesign/v3-home`: `docs/redesign/STATE.md`, `ux-method.md`, prompts V3-C to V3-H, `docs/ai/lessons.md`), the shadcn, DiceUI, ReUI and Magic UI registries (checked live), and published UX research (links at the end).

The system paper wins where this disagrees. Nothing here adds a launch feature; section 9 lists what was cut.

## 1. Decisions in this plan

| # | Decision | Why |
| --- | --- | --- |
| UX-1 | P4 has no mock data. Each P4 checkpoint runs right after the P5 checkpoint that gives it real data and hooks, and is tested on the seeded shops `juans-cafe` and `tala-apparel`. | Founder ask. Screens and data are tested together once, not twice. Mock data cost tokens and broke in the first build (`e2e/personas.ts`). |
| UX-2 | P4.0 builds the shared building blocks first (in `packages/ui`, shown on `/kit`), before any screen. | The first build hand-made the same order row on Home and on the board, with different rules (V3-H A1 bug). Every repeated part is built once. |
| UX-3 | Add 5 registry components and 1 package (section 4). Nothing else. | Each replaces code we would otherwise write by hand, and each serves a launch screen. |
| UX-4 | One storefront layout for every shop: photo-first cards, 2 columns on phones. No list/grid switch. | A layout switch is a setting, a code path and a test per shop type. Items without photos show their category's Fluent icon instead. |
| UX-5 | Checkout is one page with three short sections, not a stepper. | Baymard: the tasks asked matter more than one page vs steps. Ours is short (how, who, pay), so a stepper only adds taps and "Next" buttons. |
| UX-6 | The order status timeline uses the installed ReUI `timeline` (it already has `orientation="horizontal"`): horizontal on the receipt header, vertical in the order detail. | Nothing to install. |
| UX-7 | Status always = icon + word + colour, from one table in `packages/core`. Green = paid/done, amber = waiting/to verify, red = late/problem, member green = members only, marigold = celebration only. | Paper 9.1. The first build drifted to many tones. |
| UX-8 | Home has no "% vs last week" chips and no date-range pickers at launch. | The first build's Home broke at midnight (V3-G: −100% chips, "4873 min"). Reports already shows 7 and 30 days. |
| UX-9 | Every screen ships with loading, empty, error and offline states and 0 console errors, as part of its "Done when". | V3-F: about 1000 console errors on Home went unnoticed for a whole round. |

Founder decisions are in section 10.

## 2. What went wrong last time, and the rule now

From the first build's own docs (`STATE.md`, V3 prompts, `lessons.md`):

| What happened | Rule for P4 |
| --- | --- |
| The storefront was never built. Checkpoints 24 to 27 (storefront home, catalog, checkout, member account) were cancelled while the dashboard Home went through six prompts (V3-C to V3-H). | Customer screens come first in the slice order (P4.3, P4.4 right after products and settings). A screen gets one build prompt; fixes go into one follow-up at most. |
| Home was over-built: shortcut tiles, KPI comparisons, member charts with 7/14/30/90-day ranges, a type filter, stale-order cleanup, "coming up" scheduling, equal-height card rules. | Home shows the paper's Home only (section 6.7 below). Anything else goes to the roadmap. |
| The same order row was coded twice with different rules (Home had 3 steps, the board 4, so delivery orders could not be finished from Home). | One `nextActions()` in `packages/core`, one `OrderCard` in `packages/ui`, used everywhere an order appears. A core test proves every open order can be finished. |
| Arrows written into text and also drawn as icons ("Schedule → →"). | No arrows, emoji or symbols inside `words.ts`; icons are components. |
| About 1000 console errors (a render loop) on Home. | "0 console errors and 0 React warnings" is in every Done when. |
| Midnight broke Home (empty day looked like −100%). | No comparisons on Home at launch; every date is Manila time from `packages/core/src/time.ts`. |
| Dashboard CSS about 50 kB gz (Tailwind scanned unused examples); storefront JS about 360 kB gz per page; all strings loaded up front. | No examples folder; the `/kit` page stays in the dashboard only. Storefront pages are server components with small client islands (item sheet, cart, checkout form). |
| "Match the prototype" fix loops: each round moved spacing and colours again. | The look is decided (tokens, section 5 here). Prompts list behaviour and states, not pixels. |
| Big prompts produced messy code. | P4 is 8 small checkpoints, each testable on a phone in about 15 minutes. |

Two smaller things in today's P2 code to fix while we are there:
- `StoreNav` keeps two cart overlays (a `Sheet` for desktop and a `Drawer` for phones) with two open states. The responsive dialog (section 4) replaces both with one.
- Words: `WORDS.storefront.cart.bar` builds "Cart · 0 items ₱0" as one string. Keep words as functions, but money always comes from `formatPeso`, never typed by hand.

## 3. UX principles, made concrete

### 3.1 Who and where

- **Customer:** one hand, standing at a counter or in a jeepney, mid-range Android, mobile data, often first visit from a QR code or a Messenger link. Wants: see the menu, order in under a minute, know when it's ready.
- **Owner:** busy at the counter, phone in one hand, sometimes greasy hands; a laptop at night for products and settings. Wants: never miss an order, check GCash quickly, see today's sales.

### 3.2 Laws we apply (and where)

| Principle | Where it shows |
| --- | --- |
| **Thumb reach (Fitts)** | Main actions sit at the bottom: Add to cart, Place order, Save, the order's next step. Destructive actions (Cancel order, Delete) are small and inside a "More" menu, never next to the main button. Tap targets 44 px, inputs 16 px text. |
| **One main action per screen (Von Restorff)** | One filled button in the shop's 10% colour (storefront) or primary blue (dashboard) per screen; everything else outline or ghost. |
| **Familiar patterns (Jakob)** | Storefront behaves like GrabFood/foodpanda: sticky category chips, photo cards with a "+" button, bottom item sheet, floating cart bar. Dashboard behaves like Shopify/Square: list, detail, editor. |
| **Few choices at once (Hick)** | Checkout shows only the options the shop turned on. Payment methods the order type doesn't allow are hidden, not disabled. Product editor shows the advanced parts (stock, add-ons) collapsed until used. |
| **Chunks (Miller)** | Forms in groups of at most 5 to 7 fields (settings sections, checkout sections). Home numbers in one row of 4. |
| **Speed (Doherty, under 400 ms)** | Skeletons in the shape of the content, optimistic buttons for order steps, `preload: 'intent'` on dashboard links, Next `<Link>` prefetch. |
| **Goal gradient and endowed progress** | Stamp card always visible as stamps, with "2 more to a free drink" on the cart and the receipt. Research: a card that starts with stamps already filled is completed faster (Kivetz et al., median 10 vs 15 days). See decision F4. |
| **Peak-end** | Order placed: a calm full-screen moment with the order number big. Reward reached: confetti (the only confetti in the app). |
| **Zeigarnik** | Owner setup checklist on Home with progress ("3 of 5 done") until the shop is ready to share. |
| **Social proof** | "120 members" on the shop home (owner switch, paper 6.7); "Best seller" badge on the top items. |
| **Forgiving input (Postel)** | Phone accepts 0917…, 917…, +63 917…; money inputs accept "₱120", "120.50"; reference numbers ignore spaces. |
| **Tesler** | Smart defaults: pickup "As soon as possible"; the name and mobile remembered on the device; slug from the shop name; colour presets. |

### 3.3 Balance and layout

- 8-point spacing (Tailwind 2, 4, 6, 8). Phone gutters 16 px. Cards have one padding (16 px phone, 20 px desktop).
- One column on phones; content max widths from `PageBody` (narrow 480 for sign-in, form 720 for editors, settings 880, wide 1280).
- Visual weight: photos and prices carry the storefront; numbers and the next-step buttons carry the dashboard. Text is two weights only (regular, semibold) plus bold for prices and order numbers.
- Long names never break layouts: one line with ellipsis in cards, full in sheets.
- No empty holes: lists that are short end with their own footer, not with blank space.

### 3.4 Colour

- **Storefront, 60/30/10 (paper 9.2):** 60 = page background, 30 = header, cards and sheets, 10 = the main button, the active chip and tab, and the cart bar. Prices and text stay in the readable foreground colour, never the 10% colour. `packages/core/src/color.ts` already picks the text colour for contrast; P4.2 adds a warning in Shop look when a pair is below 4.5:1.
- **Status colours do not follow the shop colours.** Green, amber and red mean the same thing in every shop.
- **Dashboard:** navy sidebar, white surfaces, primary blue for main actions, neutral grey hovers, member green only on member things, marigold only to celebrate. Light and dark.

### 3.5 Motion and feel

- Motion budget: page fade-and-rise 8 px (View Transitions), sheet slide, the cart bar "bump" when an item is added, number ticker on Home sales only, confetti on reward only. All off under `prefers-reduced-motion`.
- Haptics on Android (`navigator.vibrate(10)`) on Add to cart and on the order's next step, behind a feature check.
- The new-order chime plays only on the dashboard and only after the owner tapped once (browsers block sound until then): a "Turn on order sound" chip until enabled.

## 4. Components: what we add, what we skip

Checked live on 2026-10-11 (shadcn base-nova registry: 63 UI + 30 blocks; DiceUI: 46; Magic UI: 78; ReUI blocks).

### 4.1 Add in P4.0 (5 components + 1 package)

| Component | Source | Replaces hand-written code for | Used on | Notes |
| --- | --- | --- | --- | --- |
| `responsive-dialog` | DiceUI (372 lines) | A centred dialog on desktop that becomes a swipe-down bottom sheet on phones, with one API | Item sheet, cart, member sign-in/join, proof upload, proof viewer, cancel reason, payment account form, category editor, icon picker | Uses our installed `dialog` and `drawer`. Fixes the double cart overlay in `StoreNav`. 1 cast to remove. |
| `qr-code` | DiceUI (539 lines) | QR rendering with SVG, canvas, a download button and a logo overlay | Receipt QR, shop QR (Home "Share shop", Settings), install guide | Needs the npm package `qrcode` 1.5.4 (founder yes needed, section 10). Replaces the planned `qrcode.react`. 4 casts to remove. |
| `stat` | DiceUI (140 lines) | KPI card: label, value, small description | Home numbers, Reports totals | Use without the trend part (UX-8). |
| `status` | DiceUI (84 lines) | Dot + label status chip | Base of our `StatusBadge` for order and payment status, "Open · until 9 PM" | |
| `scroller` | DiceUI (395 lines) | Horizontal scroll with edge fades and arrow buttons on desktop | Category chips (storefront menu and home), best sellers row, photo strip in the item sheet | |
| `progress` | shadcn (tiny) | Bar | Setup checklist, stamp progress line, upload progress | |

Each lands in `packages/ui/src/components/`, gets the no-cast fix, a line in `docs/ui-kit.md` and a demo on `/kit`. Total kit: 51 + 6 = 57.

### 4.2 Checked and skipped

| Component | Why not |
| --- | --- |
| ReUI or DiceUI `stepper` | Checkout is one page (UX-5); sign-up is 3 screens with "Step 1 of 3" text. ReUI's stepper also ships with `eslint-disable react-hooks/exhaustive-deps`. |
| A new horizontal timeline | The installed ReUI `timeline` already supports horizontal (UX-6). |
| ReUI e-commerce blocks (product card, cart, checkout, receipt, shop hero) | Paid (ReUI Pro or Ultimate licence). Our own patterns on installed parts are smaller anyway. |
| DiceUI `cropper` | 1823 lines and 20 casts. Logo and cover are centre-cropped automatically by `compressImage` and shown with `object-cover`. |
| DiceUI `time-picker` | 2498 lines. Pickup time is a short list of slots (radio or native select). |
| DiceUI `phone-input` | Country picker we don't need; `mask-input` with +63 is enough. |
| DiceUI `banner`, `relative-time-card`, `pending`, `circular-progress`, `kanban`, `tour`, `speed-dial` | `alert` covers banners; "4 min" is `date-fns`; `spinner` + disabled covers pending; the board has no drag. |
| shadcn `carousel` | Needs `embla-carousel`; `scroller` with CSS snap does the photo strip. |
| coss ui, Kibo UI, other shadcn-style libraries | Would mix a fourth and fifth visual style into the kit for parts we already have. |
| Magic UI (anything beyond confetti and number ticker) | Marketing animations: globes, marquees, shiny buttons. |

### 4.3 Our own shared patterns (built in P4.0, in `packages/ui/src/patterns/`)

Built once on installed parts, used by both apps. Each takes words and data as props (no data fetching, no `@smartapp/api`).

| Pattern | Built on | Used by |
| --- | --- | --- |
| `Money` | `formatPeso` (core) | every price |
| `StatusBadge` (`OrderStatusBadge`, `PaymentBadge`) | `status`, `STATUS_TONE` (core) | receipt, my orders, board, detail, customers |
| `QueryState` | skeleton, empty, alert, button | every list and page: loading (skeleton you pass), empty (message + action), error (message + Try again), offline |
| `OfflineBanner` | alert, `navigator.onLine` | both app shells |
| `StickyActionBar` | button | bottom action area above the safe area and the keyboard: item sheet, checkout, product editor, settings sections |
| `QuantityStepper` | button-group | item sheet, cart |
| `PhoneField`, `PesoField` | mask-input, input-group | checkout, settings, product editor |
| `CopyButton` | button, sonner | account number, order details, shop link |
| `CategoryIcon` + Fluent assets | `FLUENT_ICONS` | category chips, item placeholders, category editor |
| `PhotoField` | file-upload, `compressImage`, progress | product photos, logo, cover, payment QR, payment proof; takes an `upload(blob)` function as a prop |
| `OrderLines` | item, separator, Money | cart, checkout summary, receipt, order detail, print slip |
| `OrderTimeline` | ReUI timeline, `timelineSteps()` (core) | receipt (horizontal), order detail (vertical) |
| `OrderCard` | card, StatusBadge, `nextActions()` (core) | orders board, Home "In progress", customer's orders |
| `StampCard` | member tokens, progress, confetti | member card, receipt "Join" prompt, cart reward line, Settings preview |
| `ShopHeader` | avatar, StatusBadge | storefront home and desktop nav |
| `ProductCard` | card, Money, CategoryIcon | storefront menu, best sellers |
| `SettingsSection` | card, field, StickyActionBar | every settings section |
| `ShareShop` | qr-code, CopyButton | Home, Settings |

## 5. Screen plan

Phone wireframes for the main screens are in system paper 9.4. This section adds structure, behaviour and states. Hook names come from the backend plan (`docs/api-surface.md`); the P4 prompts use those names.

### 5.1 Storefront home `/[shop]` (P4.3)

Top to bottom: `ShopHeader` (logo, name, `StatusBadge` "Open · until 9 PM" or "Closed · opens 7 AM tomorrow"), cover photo (16:9, `next/image`), members line ("120 members · Join for stamps", only when the owner shows the count), category chips (`scroller`, each with `CategoryIcon`), Best sellers (`scroller` of `ProductCard`), "Message us on Messenger" (outline, only when set), then the tab bar and cart bar.

- Server-rendered from `get_storefront`; only the cart bar and sheets are client code.
- Closed shop: an `alert` under the header ("We're closed. Orders open 7 AM.") and Add buttons disabled with that reason. Paused orders read the same way.
- Unknown slug: the existing not-found page. Pending or suspended shop: "This shop isn't open yet."

### 5.2 Menu / Products `/[shop]/menu` (P4.3)

- Sticky search field + sticky category chips; tapping a chip scrolls to its section, scrolling highlights the chip.
- Sections per category with a 2-column `ProductCard` grid (3 to 4 on desktop). Card: photo (or the category's Fluent icon on the 30% colour), name, price "from ₱120" when variants differ, a round "+" button.
- "+" on an item with one variant and no required add-ons adds it directly (bump + toast "Added"); otherwise opens the item sheet.
- Sold out: card stays, greyed, with a "Sold out" badge; not tappable to add.
- Search: filters on the client across name and description; empty result shows "No match for 'latte'" with Clear.

### 5.3 Item sheet (P4.3, `responsive-dialog`)

Photo strip (`scroller`), name, description, variant group (`radio-group`, required, price per option), add-on groups (`checkbox` with "up to N", or radio when max is 1), note (`textarea`, 120 chars), then `StickyActionBar`: `QuantityStepper` + "Add · ₱150" (the live total). Required groups not chosen: the button says "Choose a size" and scrolls to it. Sold-out variants are shown, disabled, with "Sold out".

### 5.4 Cart (P4.3, `responsive-dialog` from the cart bar; right drawer on desktop)

`OrderLines` with `QuantityStepper` and remove (swipe is not needed; a small trash icon), the item note, subtotal, a stamp line for members ("2 more orders to a free drink" or "Reward ready: use ₱100 off" with a switch, P4.6), then "Checkout · ₱345". Cart is kept per shop in local storage and survives a reload. Empty cart: Fluent shopping bag + "Your cart is empty" + "See the menu".

### 5.5 Checkout `/[shop]/checkout` (P4.4)

One page, three sections, `StickyActionBar` with "Place order · ₱345":

1. **How:** `toggle-group` of the order types the shop turned on (Walk-in, Pickup, Delivery). Pickup: "As soon as possible" or a time slot today or tomorrow (`native-select` of slots inside business hours). Delivery: address, landmark, zone (`native-select` showing the fee) or "Fee confirmed on Messenger".
2. **Who:** name, mobile (`PhoneField`), email optional. "Remember me on this phone" on by default (local storage). Members: prefilled.
3. **Pay:** `radio-group` cards of the allowed methods. Transfer methods show the account name and number with `CopyButton`, the QR (tap to enlarge), and "Send exactly ₱345". The proof is uploaded after placing, on the receipt (paper 6.3).

Then the totals (`OrderLines` summary from `quote_order`), the privacy line with a checkbox, Place order.

- Before placing, `quote_order` re-prices the cart. Problems show on the line ("Large is sold out now") with Remove, and the button is disabled until fixed.
- Place order is idempotent (client key), so a double tap or a retry on bad data never makes two orders. The button shows a spinner and stays disabled.
- Offline: the button reads "You're offline" and is disabled; the form keeps what was typed.

### 5.6 Receipt `/[shop]/o/[token]` (P4.4)

- First view after placing: a peak moment card: "Order placed!" + `#042` big + "Show this at the counter" (walk-in) / "Pickup 3:30 PM" / "We'll message you when it's on the way".
- Then: QR of this page (`qr-code`), horizontal `OrderTimeline` with the live status, `PaymentBadge`.
- Transfer and not yet paid: a prominent "Upload proof" card (amber): `PhotoField` + reference number + Submit. After submit: "Checking your payment". Rejected: red alert with the reason + upload again.
- `OrderLines`, total, payment method.
- Actions: "Send order to our Messenger" (filled), "Copy order details", "Save receipt" (the browser's share/print), and the members card: "Join to earn stamps · this order counts" (P4.6).
- Live: `useOrderLive(token)` (Realtime broadcast, 15 s poll fallback). A status change animates the timeline step.
- Install prompt after the first order (paper 14): a small card "Add Juan's Café to your home screen", Android uses the browser's install prompt, iPhone opens the steps (P4.6).

### 5.7 My orders `/[shop]/orders` (P4.4 guest, P4.6 member)

Guest: orders placed on this phone (tokens kept in local storage), newest first, each an `item` row with `#042`, date, total, `OrderStatusBadge`. Member: the same list from the account (any device). Empty: "No orders yet" + "See the menu".

### 5.8 Account `/[shop]/account` (P4.6)

Signed out: "Join to earn stamps" explainer with the shop's rule ("Buy 10, get ₱100 off"), sign in with email → 6-digit code (P3b screen, restyled into the sheet). Signed in: `StampCard` (member green), "Reward ready" state with confetti once, saved address (edit), Sign out, and "Install this app" (steps for iPhone and Android, with screenshots drawn as simple illustrations, no photos).

### 5.9 Dashboard shell (exists from P2; P4.5 adds)

- Orders nav item shows a count of open orders; the browser tab title becomes "(2) Orders · Juan's Café".
- "Turn on order sound" chip until the first tap; chime on every new order.

### 5.10 Orders `/orders` (P4.5)

- Phone: `tabs` New 3 · Preparing 2 · Ready 1 · Out · Done today. Tablet: 2 to 3 columns. Laptop: 4 to 5 columns. Desktop ≥ 1280: the board with the order detail in a side panel.
- `OrderCard`: `#042` · type icon · age ("4 min", amber at 10, red at 20), name + Member badge, items summary ("2× Iced Latte, Ensaymada"), total + `PaymentBadge`, and one full-width next-step button from `nextActions()` (Verify payment / Mark paid / Start / Mark ready / Out for delivery / Complete). "⋯" holds Cancel, Print slip, Call, Message.
- Optimistic step; errors revert the card with the reason. No Undo (the server has no reverse steps). Cancel asks for a reason first.
- Search by number or name; "Find by number" field for the counter.
- Empty column: quiet text. Realtime off (offline): `OfflineBanner` + a Refresh button.

### 5.11 Order detail `/orders/$orderId` (P4.5)

Header: `#042`, type, `OrderStatusBadge`, age. Customer (name, mobile with Call and Message, Member badge), delivery address and landmark, `OrderLines`, totals, payment card: method, `PaymentBadge`, proof image (tap to zoom in the `responsive-dialog`), reference number with `CopyButton`, and the rule "Check this reference in your own GCash app" + Approve / Reject (reason). Vertical `OrderTimeline` with times. `StickyActionBar` with the next step. Print slip: a print-only layout, "ORDER SLIP · NOT AN OFFICIAL RECEIPT".

### 5.12 Products `/products` (P4.1)

- List grouped by category (collapsible), each row: photo/icon, name, price range, stock ("3 left" amber when low), switches Visible and Sold out inline (optimistic). Search. "Add product" in the top bar (phone: `StickyActionBar`).
- Categories screen: `sortable` list, each with `CategoryIcon`, name, hidden switch; editor in a `responsive-dialog` with the icon picker (tabs: Icons / Emoji / Photo; Icons is a searchable grid of the 110 Fluent icons).
- Product editor `/products/new`, `/products/$itemId`: Photos (`PhotoField`, up to 5, `sortable`), name, category, description, Variants (rows of name + `PesoField` + stock when tracking is on; one row = no variant UI shown to customers), "Track stock" switch with low-stock number, Add-on groups (collapsible: name, required, max, options with price), Visible, Best seller. `StickyActionBar` Save. Leaving with unsaved changes asks first. Delete becomes Archive when the item has orders.

### 5.13 Settings `/settings` (P4.2, stamp rule in P4.6)

A list of sections (`item` rows with icon and a one-line summary), each opening its own page with a `SettingsSection` and its own Save:

1. Shop look: logo, cover, name, short description, colours 60/30/10 (presets "Uling, Kape, Ube, Dagat" + `color-picker`), contrast warning, and a live phone preview (a scaled storefront header, chips and a product card using `ShopTheme`).
2. Business info: contact number, address, Facebook page and Messenger username (with "Test link").
3. Hours: 7 rows (day, open switch, from, to), closed days (`calendar`), "Pause orders now" switch with a reason.
4. Order types: Walk-in, Pickup, Delivery switches; pay-later rules (cash at the counter, pay on pickup, COD); delivery zones (name + fee) or "Fee by Messenger".
5. Payment accounts: GCash, Maya, bank rows (`sortable`), each with account name, number and QR (`PhotoField`).
6. Stamp card (P4.6): stamps needed, minimum order, reward (₱ off), show members count on the shop, with a `StampCard` preview.

### 5.14 Home `/` (P4.7)

Paper 9.4 desktop wireframe, nothing more:
- Greeting + "Share shop" (`ShareShop`: link, QR download, Messenger).
- Setup checklist until done (logo, hours, payment account, first product, order types) with `progress`; it disappears when complete.
- Attention chips: "2 to verify", "3 waiting", "1 low stock", each linking to the filtered list. Hidden when 0.
- Four `stat` cards: Sales today (number ticker), Orders (with "3 open"), Average order, New members this week.
- Members card (member green): count, top 3 suki this month.
- In progress: up to 5 `OrderCard` (compact) + "View all on Orders". Best sellers today: top 5.

### 5.15 Customers `/customers` (P4.7)

ReUI `data-grid`: name, mobile, Member badge, orders, total spent, last order; search; "Members only" toggle; CSV. Phone: `item` rows instead of the table. Row → customer sheet with their orders (`OrderCard` compact) and stamps (`StampCard` small).

### 5.16 Reports `/reports` (P4.7)

`toggle-group` Today / 7 days / 30 days. `stat` totals (sales, orders, average). Bars of sales per day (or per hour for Today) via `chart`, lazy-loaded. Best sellers table. "Download CSV" of orders. The installed payment-mix donut is not used at launch.

## 6. Engagement inside the launch scope

No new features; these make the existing ones feel alive:
- Stamp progress shown where the customer already looks: cart, receipt, account.
- "Join to earn stamps · this order counts" on the receipt, the strongest moment to join (paper 6.7 links past orders).
- Live receipt timeline (no refresh needed) and the order-placed moment.
- Best seller badges and the members count as social proof.
- Cart bar bump + haptic on add.
- For the owner: chime, tab-title count, setup checklist progress, number ticker on today's sales.

## 7. States checklist (every screen)

Loading (skeleton in the content's shape) · empty (Fluent icon, one line, one action) · error (what failed, Try again) · offline (banner; actions that need the network disabled with the reason) · closed or paused shop (storefront) · long names and big numbers (₱12,345 fits) · 390 px with no sideways scroll · dark mode (dashboard only) · keyboard open (action bar above it, dock hidden) · 0 console errors.

## 8. Checkpoints

| Checkpoint | Runs after | Builds | Phone test (both shops) |
| --- | --- | --- | --- |
| P4.0 Kit additions and shared patterns | P3b (any time before P4.1) | Section 4: 6 components, Fluent icons, core money, time and status look, `compressImage`, the shared patterns on `/kit` (order rules come from P5.4) | `/kit` on a phone: every pattern in every state |
| P4.1 Products and categories | P5.1 | 5.12 | Add a product with 2 variants, a photo and stock 3 |
| P4.2 Shop settings | P5.1 | 5.13 sections 1 to 5 | Set look, hours, order types, a GCash account with QR |
| P4.3 Storefront browse | P5.2 | 5.1 to 5.4 | Browse, search, add with options, cart survives reload |
| P4.4 Checkout and receipt | P5.3 | 5.5 to 5.7 (guest) | Walk-in cash and pickup GCash orders end to end |
| P4.5 Orders board and detail | P5.4 | 5.9 to 5.11 | Verify, start, ready, out, complete; receipt updates live |
| P4.6 Members | P5.5 | 5.8, member parts of 5.4 and 5.7, Stamp card settings | Join, stamps add, reward applies |
| P4.7 Home, customers, reports | P5.6 | 5.14 to 5.16 | Numbers match the demo data |

Who runs them: the build plan gives screens to Antigravity; the prompts work in Claude Code too. Run each in one place only.

## 9. Pushed back (not at launch)

Stepper checkout; image cropper; date-range pickers and % comparisons on Home; payment-mix donut; shortcut tiles on Home; a list/grid layout switch; product reviews, wishlist, coupons (promotions are roadmap 4); QR scanner in the dashboard (roadmap 1); push notifications (roadmap 7); kanban drag on the board; dark mode on the storefront (decision P2-1); swipe-to-delete in the cart; animated page backgrounds.

## 10. Decisions only the founder can make

| # | Question | Recommendation |
| --- | --- | --- |
| F1 | Run P4 interleaved with P5 (P5.1 → P4.1, P4.2 → P5.2 → P4.3 …) instead of all P4 first? | Yes. No mock data, and every step is testable for real. |
| F2 | Install the 6 components in section 4.1, plus the npm package `qrcode` (for the QR code)? | Yes. |
| F3 | Drop the Stepper and a new timeline (section 4.2)? | Yes, drop. The timeline we have does horizontal. |
| F4 | Give every new member 1 welcome stamp when they join? It needs one line in the P5.5 stamp rules. | Yes. Research shows pre-filled cards get finished faster; it is also a reason to join on the receipt. |

## Sources

- Baymard Institute, one-page vs multi-step checkout: https://baymard.com/blog/one-page-checkout and accordion checkout: https://baymard.com/blog/accordion-style-checkout
- Kivetz, Urminsky, Zheng, "The Goal-Gradient Hypothesis Resurrected" (coffee card, endowed progress): https://business.columbia.edu/sites/default/files-efs/pubfiles/1200/goalgradient.pdf
- Google, PWA UX playbook (install prompts, iOS instructions): https://services.google.com/fh/files/misc/pwa_ux_playbook_2020.pdf
- PWA book, chapter 4 (when to ask to install): https://pwa-book.awwwards.com/chapter-4
- Food menu patterns (sticky category tabs, quick add, cart bar): https://tryperdiem.com/blog/optimize-mobile-menu-for-restaurant-orders
- Registries checked: https://ui.shadcn.com (base-nova), https://diceui.com/r/index.json, https://magicui.design/registry.json, https://reui.io/blocks
