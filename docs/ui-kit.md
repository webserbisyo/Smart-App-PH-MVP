# UI kit: libraries, components, responsive plan

Research for P2, 2026-10-11. Sources: system paper 4.1, 8.2, 9; build plan P4 "Component research"; blueprint section 11 (UI system, decided); the shadcn registry (`registry.json` on GitHub, 54 UI components and 97 blocks); the Magic UI registry (78 components); the shadcn CLI 4.21.4 source. ReUI and DiceUI names below are from their docs as known, not re-checked: their sites are blocked from cloud sessions (see "Network").

## 1. Libraries (decided in the blueprint, kept)

| Library | What we take from it | How it installs |
| --- | --- | --- |
| shadcn/ui, **Base UI** flavour (`base-nova` style, the CLI 4.21 default) | Every basic component | `pnpm dlx shadcn@4.21.4 add <name>` into `packages/ui` |
| ReUI | Data grid, timeline, a few richer patterns | same CLI, registry `@reui` |
| DiceUI | Sortable, file upload, mask input, colour picker | same CLI, registry `@diceui` |
| Magic UI | Confetti and number ticker only (the rest is marketing animation) | same CLI, registry `@magicui` |
| Tabler icons | All icons; filled variant for the selected nav item | `@tabler/icons-react`, re-exported from `@smartapp/ui/icons` |
| Plus Jakarta Sans | The only font | `@fontsource-variable/plus-jakarta-sans`, self-hosted |
| Recharts | Through shadcn `chart`, lazy-loaded | added by the CLI with `chart` |
| Fluent Emoji 3D (Microsoft `fluentui-emoji`, MIT) | Category icons (section 8) | Not a package: a curated set of static WebP files, added in P4. No Home tiles in the MVP. |

Everything installs as source files into `packages/ui/src/components/`. We own that code from then on.

## 2. Why not 100 to 200 components

- shadcn itself has **54** components. Reaching 100 to 200 means adding most of Magic UI (78), which is landing-page animation: globes, marquees, tweet cards, iPhone mockups. None of it is on an MVP screen.
- Every installed file must pass our lint: strict type-checked, no `any`, **no type casts**. Several shadcn files ship with casts (`sidebar` and `chart` use `as React.CSSProperties`), so each file needs a small fix when it lands. 51 files is an afternoon. 200 files is days of fixing code nobody uses.
- Unused components still need upgrading when Base UI or Tailwind change, and they confuse AI agents ("which of the three tab components do I use?").
- Adding a missing one later is one command and two minutes.

**Recommendation:** install the 51 below in one go, in P2, each mapped to the screen that uses it. Everything else stays in the "add when a screen needs it" list.

## 3. Install now (P2): component → MVP screen

### shadcn (Base UI), 39

| Component | Used on |
| --- | --- |
| button | everywhere |
| button-group | quantity stepper (item sheet, cart) |
| input, label, field, input-group, textarea | checkout, sign-up, product editor, settings |
| input-otp | 6-digit email code (owner sign-up, customer sign-in) |
| select, native-select | settings selects; native select on phones for long lists (city, bank) |
| radio-group | order type, payment method, variant choice in the item sheet |
| checkbox | add-ons (choose up to N), consent line |
| switch | sold out, visible, order type switches, pause orders |
| toggle-group | Today / 7 days / 30 days on reports, light/dark switch |
| tabs | orders board on phone (New / Preparing / Ready / Out / Done), settings sections |
| card | product cards, order cards, home numbers |
| badge | order status, payment status, Member |
| avatar | customers list, account menu |
| separator, skeleton, spinner, empty | loading, empty and error states on every list |
| sheet | desktop cart drawer, phone "More" menu, filters |
| drawer | phone bottom sheets: item sheet, cart, member sign-in (swipe to close) |
| dialog, alert-dialog | proof viewer, cancel order, delete product |
| dropdown-menu, popover, tooltip | account menu, row actions, help hints |
| sonner | toasts ("Order marked ready") |
| sidebar | dashboard desktop sidebar and tablet rail |
| breadcrumb | dashboard top bar |
| scroll-area | category chips row, long sheets |
| table | reports, customers (simple) |
| chart | sales bars, payment-mix donut (lazy) |
| calendar | pickup date (today or tomorrow), closed days |
| collapsible | settings groups, order detail sections |
| alert | "Shop is closed", "Waiting for approval", offline |
| item | list rows (orders list, customers, settings rows) |

### shadcn blocks, 4 (copied as starting points, then trimmed)

| Block | Used for |
| --- | --- |
| sidebar-07 | collapses to an icon rail: our desktop sidebar and tablet rail |
| login-03, signup-03 | P3b owner log in and sign up |
| chart-pie-donut-text | payment mix donut with the total in the middle |

### ReUI, 2 · DiceUI, 4 · Magic UI, 2

| Component | Used on |
| --- | --- |
| ReUI data-grid (TanStack Table) | customers list and orders history: sort, search, members filter, CSV |
| ReUI timeline | order status timeline on the receipt and order detail |
| DiceUI sortable | category and product order, payment accounts order |
| DiceUI file-upload | product photos, logo, cover, payment QR, payment proof (wraps our compression queue) |
| DiceUI mask-input | `+63 9XX XXX XXXX` phone, GCash reference numbers |
| DiceUI color-picker | shop 60/30/10 colours with presets |
| Magic UI confetti | stamp card complete, reward redeemed (marigold = celebrate) |
| Magic UI number-ticker | Home: today's sales and orders |

ReUI and DiceUI also bring `@tanstack/react-table` and `@dnd-kit/*`. Those are approved with this list.

### Our own patterns (built, not installed)

| Pattern | Why it is ours |
| --- | --- |
| `BottomDock` (dashboard phone) | No library has an app-style bottom tab bar. Magic UI's "dock" is the macOS magnifying dock, not a phone tab bar. Copy-and-trim the old repo's V3 `BottomDock` (`webserbisyo/Smart-App-PH`, branch `redesign/v3-home`, `packages/ui/src/patterns/BottomDock.tsx`). |
| `StoreTabBar` + `CartBar` (storefront phone) | Same reason; four tabs plus the floating cart bar above them. |
| `AppShell`, `TopBar`, `PageBody` | Copy-and-trim from `reference/`. |
| `StatusBadge` | icon + word + colour from `STATUS_TONE` in core. |
| `Money` | `formatPeso`, no `.00` for whole pesos. |

### Added in P4.0 (founder decision P4-F2, 2026-10-11), 6 → kit total 57

| Component | Used on |
| --- | --- |
| DiceUI `responsive-dialog` | storefront cart, item sheet and filters: right drawer on desktop, bottom sheet on phones, one overlay |
| DiceUI `qr-code` (+ npm `qrcode` 1.5.4) | shop QR in Settings and Share, order QR on the receipt |
| DiceUI `stat` | Home "today" numbers, Reports totals |
| DiceUI `status` | open/closed dot, live-orders dot, payment to-verify dot |
| DiceUI `scroller` | storefront category tabs, orders board columns on phones |
| shadcn `progress` | photo and proof upload progress, stamp progress line |

## 4. Add later, one command each (not installed)

shadcn: accordion, aspect-ratio, carousel, command, context-menu, hover-card, kbd, menubar, navigation-menu, pagination, resizable, slider, toggle, form (superseded by field). ReUI and DiceUI: kanban (the orders board is one next-step button per card, no drag), stepper (dropped, decision P4-F3: checkout is one page), tags-input, combobox. A new timeline is not needed: the installed ReUI `timeline` already does horizontal. Magic UI: everything else.

## 5. Responsive plan (blueprint section 11, paper 9.3)

| Width | Dashboard nav | Storefront nav | Content |
| --- | --- | --- | --- |
| Phone < 768 px | Bottom dock: Home · Orders · Products · Customers · More (sheet with Reports, Settings). Top bar: title, Back on sub-pages, bell, avatar. | Bottom tabs: Home · Menu/Products · Orders · Account; cart bar floats above them | one column, 16 px gutters |
| Tablet 768 to 1023 px | Icon rail, 72 px (sidebar collapsed); tap the toggle to open it over the page | Bottom tabs stay (it is still a touch device) | two columns where it helps (orders board 2 to 3 columns) |
| Laptop 1024 to 1279 px | Sidebar 248 px, collapsible to the rail, choice remembered | Top navigation, cart drawer on the right | board 4 columns |
| Desktop ≥ 1280 px | Same sidebar; optional side panel (order detail next to the board) | Same; content max 1280 px | `PageBody` widths: full 1600, wide 1280, form 720, settings 880, narrow 480 |

One nav per device: never a dock and a sidebar at the same time. Breakpoints by width; input sizes by pointer (`pointer: coarse` gets 44 px targets and 16 px text).

## 6. App-like feel on phones (both apps)

- `viewport-fit=cover` and `env(safe-area-inset-*)` padding under the dock, tab bar and cart bar (iPhone home bar).
- `100dvh`, not `100vh`, so the address bar doesn't cut layouts.
- Inputs at 16 px so iOS doesn't zoom; `inputmode` and `autocomplete` on phone, email, OTP and money fields.
- Hide the dock while the keyboard is open (`visualViewport`), so it doesn't ride on top of the keyboard.
- Bottom sheets (`drawer`) instead of centred dialogs on phones: item sheet, cart, sign-in, filters.
- Press states (`active:`), hover only under `@media (hover: hover)`; no grey tap flash (`-webkit-tap-highlight-color: transparent`); `touch-action: manipulation`.
- Page changes: View Transitions (React 19.3 `ViewTransition`), fade and rise 8 px, off under reduced motion.
- Instant-feeling navigation: TanStack Router `preload: 'intent'`, Next `<Link>` prefetch, skeletons in the shape of the content, optimistic buttons.
- `theme-color` meta per shop (storefront) and navy (dashboard); `overscroll-behavior: contain` in sheets.
- PWA install, offline page and icons stay in P5.2 and P6.

## 7. Network: the component registries are blocked in cloud sessions

`ui.shadcn.com` (and ReUI, DiceUI, Magic UI) answer 403 from cloud sessions, so `shadcn add` fails there. npm and GitHub work. Before running P2 in a cloud session, allow these hosts in the environment's network settings: `ui.shadcn.com`, `reui.io`, `diceui.com`, `magicui.design`.

## 8. Category icons: Fluent 3D, emoji or photo (P4, saved in P5)

Founder decision, 2026-10-11. Each category (Coffee, Milk tea, Shirts…) can show one of three icons, picked in the category editor:

1. **Fluent 3D icon**, the default: a grid with search, from a curated set of about 120 shop-relevant icons (food, drinks, desserts, groceries, clothing, shoes, bags, beauty, gadgets, home, pets, gifts).
2. **Emoji**: the phone's own emoji keyboard, saved as the emoji character.
3. **Photo**: upload, compressed to a 256 px WebP like other shop images (P5.1 `shop-media` bucket).

Source and licence: Microsoft's `fluentui-emoji` repository on GitHub (MIT licence), "3D" style. Not Emojipedia: its images are not licensed for reuse. The curated files are converted once to 128 px and 256 px WebP and committed under `packages/ui/src/assets/fluent/` with a typed list (`FLUENT_ICONS`: key, name, search words) and the MIT notice. Self-hosted, no CDN, about 5 KB each.

Where it lands:
- P4.5 (products, categories): the icon picker in the category editor, the icon on category chips in the storefront menu and dashboard lists; `Category` in `packages/core` gets `icon: { kind: 'fluent', key } | { kind: 'emoji', value } | { kind: 'image', path } | null`.
- P5.1 (catalog tables): `categories.icon_kind` (check `fluent`, `emoji`, `image`) and `categories.icon_value`, with RLS like the rest of the table.
- Not in P2.
