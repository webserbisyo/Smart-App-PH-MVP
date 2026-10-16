# SF1 Storefront foundation and redesign

Track A, storefront v2 prompt 1 of 4. Replaces pages A1 to A10 of Blueprint A (A11 icons part included here).

To run it, paste this one line into Antigravity:
`Read @AGENTS.md and @docs/prompts/SF1-storefront-foundation-redesign.md and do exactly that prompt.`

**Runs after** the PR from the thread "Fix cut-off sheets and double scroll" is merged into `dev` (sheets stay inside
the screen with one scroll area). If that PR is not merged yet, stop and say so.

## Read first

`AGENTS.md`, `docs/storefront-v2.md` (all of it: it is the spec), `docs/agent-reference.md` "Storefront rules",
`docs/blueprints/A-MVP-Launch-Blueprint.md` section 4 (quality bar), `docs/ui-kit.md`, `docs/api-surface.md` slices 2
to 5, `packages/ui/src/styles/tokens.css`, `packages/ui/src/shop-theme.tsx`, `packages/core/src/color.ts`,
`apps/storefront/src/features/shell/*`. Check `node_modules/next/dist/docs/` before using a Next API.

## Goal

Every storefront page sits in one consistent, phone-first frame built from shared parts, uses the 60/30/10 palette and
semantic status colours, and has a real desktop layout; the owner sets the look with one brand colour.

Branch: `ag/sf1-storefront-foundation` from the latest `dev`.

## Build only (one commit per step)

1. **Kit installs** (`packages/ui`, `pnpm dlx shadcn@4.21.4 add ...`): `@reui/use-file-upload`, `@diceui/cropper`,
   `@diceui/banner`, `carousel` (adds `embla-carousel-react` 8.6.0; also add `embla-carousel-autoplay` 8.6.0, exact
   versions, no `^`: approved, decision SF-4), `@magicui/dot-pattern`, `@magicui/shine-border`. Remove DiceUI
   `components/file-upload.tsx` and its `/kit` demo. Fix only what lint needs (no casts, no `any`). Add each to the
   `/kit` page. Update `docs/ui-kit.md` and `docs/stack-versions.md`.
   Commit `feat(sf1): kit additions for storefront v2`.
2. **Palette and tokens.** In `packages/core/src/color.ts`: `toOklch`, `fromOklch`, `shopPalette(brandHex)` returning
   `{ primary, secondary, accent }` per `docs/storefront-v2.md` section 2 (accent darkened in OKLCH until its text
   colour passes 4.5:1), plus `softOf(hex)` and `hoverOf(hex)`. Unit tests: the four presets, a very light brand
   (`#FFE066`), a very dark one (`#111111`), every output passes `themeContrastIssues`. In `ShopTheme` add
   `--shop-10-soft`, `--shop-10-hover`. In `tokens.css` add `--radius-card: 1.25rem`, `--radius-sheet: 1.5rem` and the
   type scale from the spec. Commit `feat(sf1): one-colour shop palette`.
3. **Semantic toasts and shop buttons.** `sonner.tsx`: `richColors`, and map sonner's `--success-bg/-text/-border`,
   `--error-*`, `--warning-*`, `--info-*` to our `success`, `destructive`, `warning`, `info` soft tokens. Add `shop`
   and `shopOutline` variants to `components/button.tsx` (one cva line each) and replace the `SHOP_BUTTON` string in
   the 7 storefront files; move `CHOICE_ROW`/`PICKED` and `subscribeNothing` to one place each. Use `toast.success`,
   `toast.error`, `toast.warning`, `toast.info` by meaning everywhere in the storefront (closed shop = warning).
   Commit `feat(sf1): semantic toasts and shop buttons`.
4. **Shell.** New patterns `StoreTopBar` (logo, name, open state, bell, avatar), `AreaPill` + Area sheet (order type
   toggle-group and delivery zones from `get_storefront`, choice kept per shop in local storage; no location button
   yet), rebuilt `StoreTabBar` (floating pill, 4 tabs Home, Menu, Rewards, Orders; Rewards hidden when the stamp card
   is off; active = `bg-shop-10-soft` + filled icon), rebuilt `CartBar` (hidden at 0 items and on checkout/receipt),
   `DesktopNav` (1024 px and up). One breakpoint for nav and overlays: 1024 px (pass it to `ResponsiveDialog`; add a
   prop if needed). Set `data-keyboard` in the storefront so bars hide while typing. Render `OfflineBanner`. Bell
   opens an "Updates" sheet listing this device's open orders (from `MyOrders` storage) with their status.
   Account moves behind the avatar; new route `/[shop]/rewards` takes the member card from `/account`.
   Commit `feat(sf1): storefront shell`.
5. **System pages.** `not-found.tsx`, `error.tsx` (Try again), `loading.tsx` (skeleton in the page's shape) at app
   and `[shop]` level; unknown or inactive shop shows a neutral 404 without shop colours. Root `/` gets a short
   platform page (what Smart App PH is, link to app.webserbisyo.com). New `/[shop]/privacy` (Blueprint A, A10 content,
   plain English plus a short Filipino summary, the shop's contact) linked from checkout consent, account and the
   home footer. Commit `feat(sf1): 404, error, loading and privacy pages`.
6. **Home.** Per the phone and desktop wireframes in the spec: brand card in place of the banner (no banner data
   yet), `RewardCard` (new pattern replacing `StampCard`: gift-card 1.586:1, shop-10 gradient, `dot-pattern`, logo,
   stamp grid with a 300 ms CSS "thunk" on a new stamp, `shine-border` and confetti once when the reward is ready,
   "N more to <reward>" line), chips, best sellers, `ShopInfoList` (hours for the week with today bold, phone as
   `tel:`, address, map link, Facebook, Messenger; hidden rows when empty, from the existing columns).
   Commit `feat(sf1): shop home`.
7. **Menu, item sheet, cart.** Menu: sticky search + chips, 2-column grid (3 on desktop with the category rail; cart
   panel 360 px at 1280 px and up, right drawer from 1024 to 1279). Item sheet: shadcn `carousel` for photos (dots;
   thumbnails on desktop), `?item=<id>` opens it. `ProductCard` photos through `next/image` with `sizes`.
   Commit `feat(sf1): menu, item sheet and cart`.
8. **Checkout, receipt, orders, account, rewards.** Restyle with the same parts; one centred column max 640 px; one
   filled shop button per screen. Receipt keeps every current function (live status, QR, proof upload, Messenger,
   copy, save). Account becomes a grouped list (profile, saved addresses, install, privacy, sign out).
   Commit `feat(sf1): checkout, receipt, orders, account and rewards restyled`.
9. **PWA look.** Per-shop icons with `next/og` (`[shop]/icon` routes: 192, 512, maskable 512 with safe padding,
   apple-touch-icon 180; initials on shop-10 when no logo) used by the manifest and `<head>`; manifest
   `background_color` = 60 colour, `theme_color` = 30 colour, `id` `/<slug>`, `scope` `/<slug>/`, `start_url`
   `/<slug>?source=pwa`. `ShopSplash` pattern: logo on shop-60, shown only in standalone display mode, once per
   session, gone after first paint or 600 ms, opacity only with reduced motion. Commit `feat(sf1): shop icons and splash`.
10. **Brand editor** (dashboard `features/settings/screens/LookScreen.tsx`, existing columns only): `BrandColorField`
    (one colour, the 4 presets, "Use logo colour" from a `dominantColor` canvas helper in `packages/ui/src/lib`, live
    preview of 60/30/10, "Advanced" for three colours with the contrast warning), `LogoField` and `BannerField`
    (writes `cover_path`). Live phone preview uses the new storefront patterns. Commit `feat(sf1): brand editor`.

    **Upload fields (one family, used in SF1 and SF3).** Each is our pattern in `packages/ui/src/patterns`, built on
    `@reui/use-file-upload` and copying the layout of one ReUI example (open it with
    `pnpm dlx shadcn@4.21.4 view @reui/<id>` or on reui.io; do not install the examples):
    | Pattern | ReUI layout | Ratio and size | Used in |
    | --- | --- | --- | --- |
    | `LogoField` | `c-file-upload-2` (avatar) | 1:1, `IMAGE_SIZES.logo` 512 | Look |
    | `BannerField` | `c-file-upload-10` (cover: drop zone, hover/tap Change and Remove, progress ring, error alert with Retry, guidelines panel) | 21:9, new `IMAGE_SIZES.banner` 1600 × 686, 300 KB | Look (cover), SF3 Home page banners |
    | `PhotoGallery` | `c-file-upload-4` gallery + `c-file-upload-8` sorting (our DiceUI `sortable`) | 1:1, `IMAGE_SIZES.photo` | product editor (SF3 restyle) |
    | `ProofDrop` | `c-file-upload-3` drag and drop | any, `IMAGE_SIZES.proof` | receipt (SF3) |
    Rules for all four: the ReUI examples fake progress with `setInterval` and fail at random with `Math.random`, and
    preload a `picsum.photos` image; none of that is copied. Flow: pick or drop, then `cropper` at the fixed ratio
    (skipped for proofs), then `compressImage` on the phone (WebP, size above, before any upload: slow data), then the
    real upload to Supabase Storage through `PhotoField`'s upload function with real percent progress, real error
    text from `words.ts`, Retry and Remove. Guidelines panel text lives in `words.ts` in our words (for example "Wide
    photo, main subject in the middle", "21:9, at least 1600 px wide", "JPG, PNG or WebP, up to 10 MB before we shrink
    it"). Tabler icons only. Touch: Change and Remove are always visible on phones (no hover).

## Do not build

Banner carousel data, announcement, About text, review link, new reward kinds, location button, delivery provider,
order thread, rating, service worker, push, SEO markup, caching changes (all SF2/SF3). No database change. No dark
mode on the storefront. No new package beyond step 1.

## Exact values

Tab bar: a floating pill dock (not a full-width bar), 64 px high, 12 px from the sides and above the bottom safe area, max width 440 px centred, radius full, shadow `--shadow-lg`, shop-30 surface at 90% with `backdrop-blur`, no raised centre button (decision from P4); active tab = shop-10 soft pill with filled icon and label. Page content gets bottom padding of dock + cart bar + safe area so nothing is hidden under them; neither causes sideways scroll at 360 px. Top bar 56 px. Cart bar
56 px, 8 px above the tab bar. Touch targets 44 px, inputs 16 px. Motion per Blueprint A 4.4 (200 ms enter, 300/225 ms
sheets, nothing over 400 ms); the storefront does not import `motion`.

## States to show

Blueprint A 4.2 on every page, plus: closed shop (Add disabled with the reason, warning toast on tap), paused orders,
no logo, no cover, stamp card off (no Rewards tab), long shop and item names, ₱12,345.50 totals, 0 items, keyboard
open, offline.

## Done when (agent in its browser, then the founder on a phone with both demo shops)

- At 360, 390, 768, 1024 and 1280 px no page scrolls sideways; every sheet stays inside the screen with one scroll area.
- `/juans-cafe` and `/tala-apparel` show their own palettes; `/tala-apparel` says Products where Juan's says Menu.
- A success toast is green, an error red, a warning amber, an info blue, in both apps.
- Phone: floating tab bar, cart bar only with items, bars hide while typing. Desktop: top nav, category rail, cart panel.
- `/juans-cafe/xyz` and `/no-such-shop` show the designed 404; `/juans-cafe/privacy` exists and checkout links to it.
- In the dashboard Look screen one colour change re-themes the preview and, after Save, the storefront.
- An installed shop app on Android shows the shop icon and splash colour.
- `pnpm check` and `pnpm build` green, 0 console errors.

## Test locally

`pnpm local start`, `pnpm local env local`, `pnpm local reset`, `pnpm local demo`, `pnpm dev`; link owner accounts
with `pnpm local owner <email> juans-cafe` and a second email for `tala-apparel` (`docs/local-dev.md`). Check
http://localhost:3000/juans-cafe and /tala-apparel at 390 and 1280.

## Finish

`pnpm check` and `pnpm build` green; screenshots of every storefront page at 390 and 1280 for both shops, and the Look
screen, in the PR; tick SF1 in `docs/PROGRESS.md` (2 log lines), one `docs/CHANGELOG.md` line; push the branch, open a
PR into `dev` with the PR template; never push `dev`, `next` or `main`; reply with the 5 lines and the PR link.
