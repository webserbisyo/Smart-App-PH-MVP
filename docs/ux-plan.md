# UX guide

How every launch screen looks and behaves. The system paper wins where this disagrees. Kit and patterns:
`docs/ui-kit.md`. Quality bar per page: `docs/blueprints/A-MVP-Launch-Blueprint.md` section 4.

## 1. Screen rules (decision P4-2)

| # | Rule |
| --- | --- |
| UX-1 | No mock data. Every screen runs on the real API and is tested on the demo shops `juans-cafe` and `tala-apparel`. |
| UX-2 | A part used on more than one screen is built once in `packages/ui` (shown on `/kit`) and reused. |
| UX-3 | Use the installed kit (`docs/ui-kit.md`); add a component only when a screen needs it. |
| UX-4 | One storefront layout for every shop: photo-first cards, 2 columns on phones. No list/grid switch. |
| UX-5 | Checkout is one page with three short sections, not a stepper. |
| UX-6 | The order status timeline uses the installed ReUI `timeline` (it already has `orientation="horizontal"`): horizontal on the receipt header, vertical in the order detail. |
| UX-7 | Status always = icon + word + colour, from one table in `packages/core`. Green = paid/done, amber = waiting/to verify, red = late/problem, member green = members only, marigold = celebration only. |
| UX-8 | Home has no "% vs last week" chips and no date-range pickers at launch. |
| UX-9 | Every screen ships with loading, empty, error and offline states and 0 console errors, as part of its "Done when". |

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

## 4. Components

See `docs/ui-kit.md` for every installed component and shared pattern, and when to use each.

## 5. Screen plan

Phone wireframes for the main screens are in system paper 9.4. This section adds structure, behaviour and states. Hook names come from the backend plan (`docs/api-surface.md`); the P4 prompts use those names.

### 5.1 Storefront home `/[shop]`

Top to bottom: `ShopHeader` (logo, name, `StatusBadge` "Open · until 9 PM" or "Closed · opens 7 AM tomorrow"), cover photo (16:9, `next/image`), members line ("120 members · Join for stamps", only when the owner shows the count), category chips (`scroller`, each with `CategoryIcon`), Best sellers (`scroller` of `ProductCard`), "Message us on Messenger" (outline, only when set), then the tab bar and cart bar.

- Server-rendered from `get_storefront`; only the cart bar and sheets are client code.
- Closed shop: an `alert` under the header ("We're closed. Orders open 7 AM.") and Add buttons disabled with that reason. Paused orders read the same way.
- Unknown slug: the existing not-found page. Pending or suspended shop: "This shop isn't open yet."

### 5.2 Menu / Products `/[shop]/menu`

- Sticky search field + sticky category chips; tapping a chip scrolls to its section, scrolling highlights the chip.
- Sections per category with a 2-column `ProductCard` grid (3 to 4 on desktop). Card: photo (or the category's Fluent icon on the 30% colour), name, price "from ₱120" when variants differ, a round "+" button.
- "+" on an item with one variant and no required add-ons adds it directly (bump + toast "Added"); otherwise opens the item sheet.
- Sold out: card stays, greyed, with a "Sold out" badge; not tappable to add.
- Search: filters on the client across name and description; empty result shows "No match for 'latte'" with Clear.

### 5.3 Item sheet

Photo strip (`scroller`), name, description, variant group (`radio-group`, required, price per option), add-on groups (`checkbox` with "up to N", or radio when max is 1), note (`textarea`, 120 chars), then `StickyActionBar`: `QuantityStepper` + "Add · ₱150" (the live total). Required groups not chosen: the button says "Choose a size" and scrolls to it. Sold-out variants are shown, disabled, with "Sold out".

### 5.4 Cart

`OrderLines` with `QuantityStepper` and remove (swipe is not needed; a small trash icon), the item note, subtotal, a stamp line for members ("2 more orders to a free drink" or "Reward ready: use ₱100 off" with a switch, P4.6), then "Checkout · ₱345". Cart is kept per shop in local storage and survives a reload. Empty cart: Fluent shopping bag + "Your cart is empty" + "See the menu".

### 5.5 Checkout `/[shop]/checkout`

One page, three sections, `StickyActionBar` with "Place order · ₱345":

1. **How:** `toggle-group` of the order types the shop turned on (Walk-in, Pickup, Delivery). Pickup: "As soon as possible" or a time slot today or tomorrow (`native-select` of slots inside business hours). Delivery: address, landmark, zone (`native-select` showing the fee) or "Fee confirmed on Messenger".
2. **Who:** name, mobile (`PhoneField`), email optional. "Remember me on this phone" on by default (local storage). Members: prefilled.
3. **Pay:** `radio-group` cards of the allowed methods. Transfer methods show the account name and number with `CopyButton`, the QR (tap to enlarge), and "Send exactly ₱345". The proof is uploaded after placing, on the receipt (paper 6.3).

Then the totals (`OrderLines` summary from `quote_order`), the privacy line with a checkbox, Place order.

- Before placing, `quote_order` re-prices the cart. Problems show on the line ("Large is sold out now") with Remove, and the button is disabled until fixed.
- Place order is idempotent (client key), so a double tap or a retry on bad data never makes two orders. The button shows a spinner and stays disabled.
- Offline: the button reads "You're offline" and is disabled; the form keeps what was typed.

### 5.6 Receipt `/[shop]/o/[token]`

- First view after placing: a peak moment card: "Order placed!" + `#042` big + "Show this at the counter" (walk-in) / "Pickup 3:30 PM" / "We'll message you when it's on the way".
- Then: QR of this page (`qr-code`), horizontal `OrderTimeline` with the live status, `PaymentBadge`.
- Transfer and not yet paid: a prominent "Upload proof" card (amber): `PhotoField` + reference number + Submit. After submit: "Checking your payment". Rejected: red alert with the reason + upload again.
- `OrderLines`, total, payment method.
- Actions: "Send order to our Messenger" (filled), "Copy order details", "Save receipt" (the browser's share/print), and the members card: "Join to earn stamps · this order counts" (P4.6).
- Live: `useOrderLive(token)` (Realtime broadcast, 15 s poll fallback). A status change animates the timeline step.
- Install prompt after the first order (paper 14): a small card "Add Juan's Café to your home screen", Android uses the browser's install prompt, iPhone opens the steps (P4.6).

### 5.7 My orders `/[shop]/orders`

Guest: orders placed on this phone (tokens kept in local storage), newest first, each an `item` row with `#042`, date, total, `OrderStatusBadge`. Member: the same list from the account (any device). Empty: "No orders yet" + "See the menu".

### 5.8 Account `/[shop]/account`

Signed out: "Join to earn stamps" explainer with the shop's rule ("Buy 10, get ₱100 off"), sign in with email → 6-digit code (P3b screen, restyled into the sheet). Signed in: `StampCard` (member green), "Reward ready" state with confetti once, saved address (edit), Sign out, and "Install this app" (steps for iPhone and Android, with screenshots drawn as simple illustrations, no photos).

### 5.9 Dashboard shell

- Orders nav item shows a count of open orders; the browser tab title becomes "(2) Orders · Juan's Café".
- "Turn on order sound" chip until the first tap; chime on every new order.

### 5.10 Orders `/orders`

- Phone: `tabs` New 3 · Preparing 2 · Ready 1 · Out · Done today. Tablet: 2 to 3 columns. Laptop: 4 to 5 columns. Desktop ≥ 1280: the board with the order detail in a side panel.
- `OrderCard`: `#042` · type icon · age ("4 min", amber at 10, red at 20), name + Member badge, items summary ("2× Iced Latte, Ensaymada"), total + `PaymentBadge`, and one full-width next-step button from `nextActions()` (Verify payment / Mark paid / Start / Mark ready / Out for delivery / Complete). "⋯" holds Cancel, Print slip, Call, Message.
- Optimistic step; errors revert the card with the reason. No Undo (the server has no reverse steps). Cancel asks for a reason first.
- Search by number or name; "Find by number" field for the counter.
- Empty column: quiet text. Realtime off (offline): `OfflineBanner` + a Refresh button.

### 5.11 Order detail `/orders/$orderId`

Header: `#042`, type, `OrderStatusBadge`, age. Customer (name, mobile with Call and Message, Member badge), delivery address and landmark, `OrderLines`, totals, payment card: method, `PaymentBadge`, proof image (tap to zoom in the `responsive-dialog`), reference number with `CopyButton`, and the rule "Check this reference in your own GCash app" + Approve / Reject (reason). Vertical `OrderTimeline` with times. `StickyActionBar` with the next step. Print slip: a print-only layout, "ORDER SLIP · NOT AN OFFICIAL RECEIPT".

### 5.12 Products `/products`

- List grouped by category (collapsible), each row: photo/icon, name, price range, stock ("3 left" amber when low), switches Visible and Sold out inline (optimistic). Search. "Add product" in the top bar (phone: `StickyActionBar`).
- Categories screen: `sortable` list, each with `CategoryIcon`, name, hidden switch; editor in a `responsive-dialog` with the icon picker (tabs: Icons / Emoji / Photo; Icons is a searchable grid of the 110 Fluent icons).
- Product editor `/products/new`, `/products/$itemId`: Photos (`PhotoField`, up to 5, `sortable`), name, category, description, Variants (rows of name + `PesoField` + stock when tracking is on; one row = no variant UI shown to customers), "Track stock" switch with low-stock number, Add-on groups (collapsible: name, required, max, options with price), Visible, Best seller. `StickyActionBar` Save. Leaving with unsaved changes asks first. Delete becomes Archive when the item has orders.

### 5.13 Settings `/settings`

A list of sections (`item` rows with icon and a one-line summary), each opening its own page with a `SettingsSection` and its own Save:

1. Shop look: logo, cover, name, short description, colours 60/30/10 (presets "Uling, Kape, Ube, Dagat" + `color-picker`), contrast warning, and a live phone preview (a scaled storefront header, chips and a product card using `ShopTheme`).
2. Business info: contact number, address, Facebook page and Messenger username (with "Test link").
3. Hours: 7 rows (day, open switch, from, to), closed days (`calendar`), "Pause orders now" switch with a reason.
4. Order types: Walk-in, Pickup, Delivery switches; pay-later rules (cash at the counter, pay on pickup, COD); delivery zones (name + fee) or "Fee by Messenger".
5. Payment accounts: GCash, Maya, bank rows (`sortable`), each with account name, number and QR (`PhotoField`).
6. Stamp card (P4.6): stamps needed, minimum order, reward (₱ off), show members count on the shop, with a `StampCard` preview.

### 5.14 Home `/`

Paper 9.4 desktop wireframe, nothing more:
- Greeting + "Share shop" (`ShareShop`: link, QR download, Messenger).
- Setup checklist until done (logo, hours, payment account, first product, order types) with `progress`; it disappears when complete.
- Attention chips: "2 to verify", "3 waiting", "1 low stock", each linking to the filtered list. Hidden when 0.
- Four `stat` cards: Sales today (number ticker), Orders (with "3 open"), Average order, New members this week.
- Members card (member green): count, top 3 suki this month.
- In progress: up to 5 `OrderCard` (compact) + "View all on Orders". Best sellers today: top 5.

### 5.15 Customers `/customers`

ReUI `data-grid`: name, mobile, Member badge, orders, total spent, last order; search; "Members only" toggle; CSV. Phone: `item` rows instead of the table. Row → customer sheet with their orders (`OrderCard` compact) and stamps (`StampCard` small).

### 5.16 Reports `/reports`

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
