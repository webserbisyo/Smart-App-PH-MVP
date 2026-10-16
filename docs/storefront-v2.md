# Storefront v2: the approved spec

The customer storefront is rebuilt in four prompts (`docs/prompts/SF1` to `SF4`). They replace Track A pages A1 to
A12. Decisions: `docs/decisions.md` "Storefront v2" (SF-1 to SF-24). Component sources and the reasons for each pick:
section 5 here, full research in the project files (`research/storefront-redesign/component-map.md`).

| Prompt | What it delivers | Database? |
| --- | --- | --- |
| SF1 Foundation and redesign | tokens, 60/30/10 palette, shell, shared patterns, every storefront page restyled, system pages, privacy page, splash and icons, brand editor on existing columns | no |
| SF2 Database | rewards types, shop content (announcement, banners, about, review link), order messages, ratings, delivery info, push subscriptions and outbox, zone locations | yes, additive only |
| SF3 Features and demo content | the SF2 features on screen in both apps, service worker, push, SEO, caching, demo photos for both demo shops | no new tables |
| SF4 Smoke tests and docs | Playwright smoke at 390 and 1280, docs refresh, repo description | no |

## 1. Layout

### Phone (below 1024 px, designed at 390)

```
┌──────────────────────────────┐
│ (logo) Juan's Cafe   [🔔][👤]│  top bar, 56 px, shop-30 surface, sticky
│ ● Open until 9 PM            │
│ [ Pickup ▾ · Poblacion ]     │  Area pill: order type + delivery zone
├──────────────────────────────┤
│ ┌──────────────────────────┐ │  banner carousel (up to 3), 2:1, radius 20,
│ │   banner / video slide   │ │  dots; no banner = brand card with logo + tagline
│ └──────────── • ○ ○ ───────┘ │
│ (i) Announcement text   [x]  │  announcement strip (DiceUI banner), tone colour
│ ┌──────────────────────────┐ │  RewardCard (gift-card style) or "Join and get
│ │ ★★★☆☆☆☆☆☆☆  3 of 10      │ │  1 free stamp" card when signed out
│ │ 7 more to a free Latte   │ │
│ └──────────────────────────┘ │
│ (☕)(🧋)(🥐)(🍛) chips       │  categories, sticky on Menu
│ Best sellers →  [card][card] │
│ About · Hours · Contact      │  shop info list (phone, address, map, FB)
├──────────────────────────────┤
│ [ 3 items · ₱345   View ▸ ] │  cart bar, only with items, above the tabs
│ ( Home  Menu  Rewards Orders )│  floating pill tab bar, 64 px, 12 px from edges
└──────────────────────────────┘
```

- Four tabs: Home, Menu (vocab: Menu or Products), Rewards, Orders. Rewards is hidden when the stamp card is off.
  Account (profile, saved addresses, notifications, privacy, sign out) opens from the avatar as a grouped list.
- Menu: sticky search and category chips (scroll spy), 2-column photo grid, round "+" quick add.
- Item: bottom sheet with a photo carousel (dots), options, note, sticky "Add · ₱150". `?item=<id>` opens it, so an
  item can be shared.
- Bars hide while the keyboard is open; the cart bar is hidden at 0 items and on checkout and receipt.

### Desktop (1024 px and up, designed at 1280)

```
┌──────────────────────────────────────────────────────────────────────┐
│ (logo) Juan's Cafe  Home  Menu  Rewards  Orders   [Pickup ▾]  🔔  👤 [Cart 3] │  64 px top nav
├──────────────────────────────────────────────────────────────────────┤
│        max width 1120, centred, 24 px gutters                         │
│  ┌────────────────────────────────────┐ ┌──────────────────────────┐ │
│  │ banner carousel 2.5:1              │ │ RewardCard               │ │  home: 8/4 columns
│  └────────────────────────────────────┘ │ About · Hours · Contact  │ │
│  chips · best sellers (4 across)        └──────────────────────────┘ │
│ ─────────────────────────────────────────────────────────────────── │
│  Menu page: ┌ categories ┐ ┌ grid, 3 across ───────┐ ┌ cart 360 ──┐  │  sticky rail and cart
│             │ rail 220   │ │                        │ │ (1280+)    │  │  1024-1279: cart is a
│             └────────────┘ └────────────────────────┘ └────────────┘  │  right drawer
└──────────────────────────────────────────────────────────────────────┘
```

- Sheets become centred dialogs (item) or a right drawer (cart) at 1024 px, the same breakpoint as the nav, so
  768 to 1023 px is one consistent phone-style layout (centred, max 640 px).
- Checkout and receipt: one centred column, max 640 px, on every size.

## 2. Colour: 60/30/10 plus fixed status colours

| Share | Role | Token | Built from |
| --- | --- | --- | --- |
| 60% | page background | `--shop-60` | brand hue, OKLCH L 0.975, C 0.012 |
| 30% | cards, sheets, bars, tab bar | `--shop-30` | brand hue, L 0.995, C 0.004 (near white) |
| 10% | main button, active tab, stamps, prices that matter | `--shop-10`, `--shop-10-foreground` | the brand colour, darkened in OKLCH until white text reaches 4.5:1 (else black text) |
| helpers | chip selected, hover, soft fills | `--shop-10-soft`, `--shop-10-hover` | 10% at L 0.93 / 10% minus 0.06 L |

- The owner picks **one brand colour** (or a preset, or "use logo colour"); `shopPalette(brand)` in core fills the
  three existing columns (`color_primary` = 60, `color_secondary` = 30, `color_accent` = 10). "Advanced" lets the owner
  set each one; the contrast check (`themeContrastIssues`) still blocks unreadable sets with a warning.
- Status colours never follow the shop: success green, error red, warning amber, info blue (`tokens.css` success,
  destructive, warning, info). Toasts (sonner `richColors`), alerts, badges and the announcement tones use them.
- One filled shop-10 button per screen. Text on 60 and 30 uses `--foreground` / `--muted-foreground`.

Shape and type: card radius 20 px (`--radius-card`), sheet top radius 24 px, chips and pills fully round; 4 px spacing
grid, page gutter 16 px phone / 24 px desktop; type 12, 14, 16, 18, 22, 28 px, two weights (400, 600) plus 700 for
prices and order numbers; Plus Jakarta Sans only; money tabular.

## 3. Defaults (a new shop before the owner changes anything)

| Thing | Default |
| --- | --- |
| Brand colour | `#2456D3` (platform blue) → palette per section 2 |
| Logo | initials on shop-10 in a circle |
| Banner | none → a brand card (shop-10 gradient, logo, name, tagline) |
| Announcement | none (strip hidden) |
| About, contact | hidden until filled; hours list always shown |
| Order type pill | the first enabled type, in order pickup, delivery, walk-in; remembered per shop on the device |
| Stamp card | off; when turned on: 10 stamps, reward "₱100 off" (discount), 1 welcome stamp |
| Notifications | off until the customer taps "Notify me" on the receipt |
| Review link | none (button hidden) |

## 4. Features and flows

- **Rewards.** Three reward kinds: peso discount (today), free item (owner picks a menu item and variant; it is added
  at ₱0 when the member uses the reward at checkout), custom prize (title, picture, short description; the member taps
  "Claim", shows a QR and code, the owner marks it given). Stamps stay server-awarded (one per completed paid order
  over the minimum). No stamps for reviews.
- **Area / location.** The Area pill opens a sheet: order type (Pickup, Delivery, Walk-in as enabled) and, for
  delivery, the shop's own zones with fee and ETA. "Use my location" asks the browser for a position once and
  suggests the nearest zone that has a centre point. No map API, no address search at launch.
- **Delivery.** The owner books their own rider or Lalamove/Grab in that app, then in the order picks the provider
  (Own rider, Lalamove, Grab, Other), pastes the tracking link (https, known hosts only for Lalamove and Grab) and an
  optional rider name and phone, and taps the status steps. The customer sees "Track your delivery" and the rider on
  the receipt and gets an update.
- **Receipt.** Live status, QR of the receipt link (shown at pickup), save/share link, Messenger hand-off, the order
  thread (payment proof first), "Track your delivery", rating after completion, "Review us on Google" when the shop
  set a link.
- **Order messages.** `order_messages` holds the thread; at launch only two kinds are written: the customer's payment
  proof (picture + reference number; reused reference numbers are already refused per shop) and system lines (proof
  approved or rejected, status changes). Free text chat is after launch. Messenger link stays.
- **Rating.** One private rating per completed order (1 to 5 stars, optional comment up to 300 characters), shown to
  the owner on the order and as an average on Reports. No review markup, no public stars.
- **PWA.** Per-shop manifest (exists) with generated icons (192, 512, maskable, apple-touch 180) from the logo; Android
  splash comes from the manifest; an in-app splash (logo on shop-60, at most 600 ms, once per session, standalone
  mode only) covers iOS; a hand-written service worker (offline page with the shop name, push, notification click);
  push for order status to customers who tapped "Notify me" (iOS only after Add to Home Screen).
- **Consent.** Order updates are transactional. Marketing (push, email, SMS) needs its own unticked opt-in per channel,
  stored in `consents` with time and source. Privacy page per shop, linked from checkout, account and the footer.
- **SEO.** Per-shop title and description (exist), Open Graph image per shop, `LocalBusiness` JSON-LD without ratings
  (type word from vocab), sitemap of active shops, canonical URLs.

## 5. Components

Full table with sources: project files `research/storefront-redesign/component-map.md`. Summary:

| Need | Use |
| --- | --- |
| Logo, banner, product photos, payment proof | `PhotoField` family on ReUI `use-file-upload`: `LogoField`, `BannerField`, `PhotoGallery`, `ProofDrop`; DiceUI `cropper`. DiceUI `file-upload` is removed |
| Brand colour | DiceUI `color-picker` (installed) inside our `BrandColorField` (presets, logo colour, contrast preview) |
| Banner carousel, item photos | shadcn `carousel` (Embla 8.6.0 + autoplay); `VideoSlide` facade for YouTube |
| Announcement | DiceUI `banner` |
| Toasts | sonner with `richColors` and our status tokens |
| Stamp card | `RewardCard` pattern + Magic UI `dot-pattern`, `shine-border`; confetti on reward ready |
| Rating | DiceUI `rating` |
| Order thread | shadcn `message`, `bubble`, `attachment` |
| Sheets and dialogs | Base UI `drawer` / `responsive-dialog` (after the overlay fix) |
| QR | DiceUI `qr-code` (installed) |

New patterns in `packages/ui/src/patterns`: `StoreTopBar`, `AreaPill`, `StoreTabBar` (rebuilt), `CartBar` (rebuilt),
`DesktopNav`, `BannerCarousel`, `VideoSlide`, `AnnouncementStrip`, `RewardCard`, `ShopInfoList`, `ShopSplash`,
`LogoField`, `BannerField`, `PhotoGallery`, `ProofDrop`, `BrandColorField`, `OrderThread`, `RatingField`.

## 6. Data added in SF2 (all additive, nullable or defaulted)

| Table | Change |
| --- | --- |
| `loyalty_rules` | `reward_kind` (`discount` default, `free_item`, `custom`), `reward_item_id`, `reward_variant_id`, `reward_title`, `reward_description`, `reward_image_path` |
| `reward_claims` (new) | custom-prize claims: member, code, status `pending` / `given` / `cancelled`, times |
| `shop_settings` | `announcement_text`, `announcement_tone` (`info`, `promo`, `warning`), `announcement_ends_at`, `about_text`, `google_review_url` |
| `shop_banners` (new) | up to 3 slides: `kind` (`image`, `youtube`), `image_path`, `youtube_id`, `title`, `link_url`, `sort`, `is_active` |
| `delivery_zones` | `center_lat`, `center_lng` |
| `orders` | `delivery_provider` (`own`, `lalamove`, `grab`, `other`), `rider_name`, `rider_phone` (`tracking_url` exists) |
| `order_messages` (new) | order thread: `sender` (`customer`, `owner`, `system`), `kind` (`text`, `image`, `payment_proof`, `status`), `body`, `attachment_path`, `payment_id` |
| `order_ratings` (new) | one per order: `stars` 1 to 5, `comment` up to 300 |
| `push_subscriptions` (new) | endpoint, keys, optional `customer_id`; link table `order_push_subscriptions` |
| `notification_outbox` (new) | queued push messages, sent by the storefront's dispatch route |
