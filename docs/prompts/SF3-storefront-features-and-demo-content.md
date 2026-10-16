# SF3 Storefront features and demo content

Track A, storefront v2 prompt 3 of 4. Puts the SF2 data on screen in both apps, adds the service worker, push, SEO and
caching, and gives both demo shops real photos and content. Replaces Blueprint A pages A11 (offline part) and A12.

To run it, paste this one line into Antigravity:
`Read @AGENTS.md and @docs/prompts/SF3-storefront-features-and-demo-content.md and do exactly that prompt.`

**Runs after** SF2 is merged into `dev` (its tables are live and in `database.types.ts`).

## Read first

`AGENTS.md`, `docs/storefront-v2.md` (sections 1, 3, 4, 5), `docs/api-surface.md` (the SF2 names),
`docs/agent-reference.md` "Storefront rules" and "Database rules", `node_modules/next/dist/docs/` for route handlers,
`opengraph-image`, `sitemap` and caching in Next 16, and the Next PWA guide
(`docs/01-app/02-guides/progressive-web-apps.mdx` in the same folder).

## Goal

A customer sees the shop's banners, announcement, about and contact, picks their area, earns any of the three reward
kinds, follows a delivery, sends a payment proof as a message, rates the order and gets a push when it is ready; the
owner manages all of it; both demo shops look like real shops.

Branch: `ag/sf3-storefront-features` from the latest `dev`.

## Build only (one commit per step)

1. **Shop content (both apps).** Storefront: `BannerCarousel` (shadcn `carousel` + autoplay 5 s, pauses on touch and
   when hidden, first slide server-rendered as the page's main image), `VideoSlide` (YouTube facade: thumbnail from
   `i.ytimg.com` through a fixed `remotePatterns` entry, `youtube-nocookie.com` iframe only after tap, unloaded when the
   slide leaves), `AnnouncementStrip` (DiceUI `banner`, tone colour from status tokens, dismiss kept per shop and text),
   About section in `ShopInfoList`, "Review us on Google" on the receipt after completion. Dashboard Settings: "Home
   page" screen (banners: up to 3, `BannerField` (SF1 upload rules: 21:9 crop, compressed on the phone, real upload and Retry) with image upload or "Paste image link" or YouTube link, reorder with
   `sortable`; announcement text, tone, end date; about text; Google review link). Commit `feat(sf3): banners,
   announcement, about`.
2. **Image links, imported safely.** Route handler `apps/storefront/src/app/api/media/import/route.ts` with the logic in
   `packages/api` (server): owner's JWT required and must own the shop; https only; resolve DNS and refuse private,
   loopback and link-local addresses (also after redirects, max 2); `content-type` jpeg, png or webp checked against
   the file's first bytes; max 2 MB; 8 s timeout; stored in `shop-media/<tenant>/imported/<uuid>.<ext>`; returns the
   path. Never hotlink, never widen `images.remotePatterns` beyond the Supabase host and `i.ytimg.com`. Commit
   `feat(sf3): import image links into storage`.
3. **Area and location.** `AreaPill` sheet gets "Use my location" (one `getCurrentPosition` on tap, nearest zone with a
   centre point by straight-line distance, suggestion only, the customer confirms). Dashboard Order types: optional
   zone centre (paste a Google Maps link and read the coordinates from it, or type them). Commit `feat(sf3): area and
   nearest zone`.
4. **Rewards.** Dashboard Stamp card screen: reward kind (discount, free item with item and variant picker, custom
   prize with title, description and picture via `PhotoField`), live `RewardCard` preview; Customers sheet: open claims
   with Given / Cancel. Storefront: `RewardCard` shows the reward picture or item; checkout reward switch for discount
   and free item; Rewards tab "Claim prize" for custom (QR + 6-character code, pending state, given state). Commit
   `feat(sf3): three reward kinds on screen`.
5. **Order thread, delivery, rating.** Receipt: `OrderThread` (shadcn `message`, `bubble`, `attachment`) with the
   payment proof as the customer's message (`ProofDrop` per the SF1 upload rules: camera or gallery, compress, real upload with progress and Retry, reference number) and system
   lines in words; "Track your delivery" button and rider name/phone (`tel:`) when set; `RatingField` (DiceUI `rating`
   + comment) once completed. Dashboard order detail: the same thread, a Delivery card (provider, link, rider; replaces
   the tracking dialog flow), the rating read-only; Reports: rating average and count. Commit `feat(sf3): order thread,
   delivery tracking, ratings`.
6. **Service worker and push.** Add `web-push` 3.6.7 and `@types/web-push` 3.6.4 to `packages/api` (approved, decision
   SF-4). Hand-written `apps/storefront/public/sw.js` (no library): `push` shows the notification, `notificationclick`
   opens or focuses the receipt URL, navigation failure shows `/offline.html` (shop-neutral, retry button); it never
   caches orders, prices or API responses. Register with `scope: '/'` and `updateViaCache: 'none'`; headers for
   `/sw.js` per the Next PWA guide. Receipt "Notify me when it's ready" (user tap, then `subscribeOrderPush`; on iOS
   only when installed, otherwise show the install steps). Route `apps/storefront/src/app/api/push/dispatch/route.ts`:
   checks the secret header, claims a batch through `packages/api` server code (`claim_push_batch` with the same
   secret; no service-role key), sends with VAPID, marks sent, deletes subscriptions that answer 404/410. Env names only
   in `.env.example` (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `PUSH_DISPATCH_SECRET`);
   never read or print real values. Marketing opt-ins: none are offered yet (decision SF-14). Commit `feat(sf3):
   service worker, offline page, order push`.
7. **SEO and speed.** `opengraph-image` per shop (logo, name, palette), `LocalBusiness` JSON-LD from shop data (the
   schema type word comes from vocab; no ratings), `sitemap.ts` of active shops, canonical URLs, `robots.ts`. Replace
   `force-dynamic` with cached shop data per slug tagged `shop:<slug>`; a revalidate route checks the owner's JWT and
   refreshes the tag; `packages/api` calls it after every owner save that changes storefront data (stock and prices
   stay safe: `quote_order` re-checks at checkout). Commit `feat(sf3): SEO and cached shop pages`.
8. **Demo content (the two demo shops only).** About 30 Pexels photos (license allows re-hosting; credits file
   required), chosen by hand: juans-cafe (17 items, 4 category photos optional, logo, 3 banners: coffee, pastries,
   rice meal), tala-apparel (14 items, logo, 3 banners: new arrivals, dresses, accessories). Convert to WebP at
   `IMAGE_SIZES` (photo 1600 px max, 300 KB; thumb 400; logo 512 square) plus `-thumb`. Commit them to
   `supabase/demo-media/<slug>/` with `supabase/demo-media/CREDITS.md` (photo URL, photographer, Pexels license link).
   No Unsplash files. Storage path `demo/<slug>/<file>.webp` in `shop-media`. Upload: local via `config.toml`
   `[storage.buckets.shop-media] objects_path` if it works with the migration-created bucket, else a script
   `packages/api/scripts/demo-media.ts` (`pnpm demo:media --target local|live`, reads `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` from the shell, never from files). New migration: `private.demo_seed_catalog` and
   `demo_reset` set logo, cover, item photos, banners (one YouTube slide in juans-cafe), announcement, about, review
   link, zone centres, the free-item reward for juans-cafe and the custom prize (tote bag) for tala-apparel, a few
   ratings and order threads. Only `is_demo` shops are touched; no demo data in app code. Commit `feat(sf3): demo photos
   and content for both demo shops`.

## Do not build

Lalamove API, SMS, owner campaign sending, free-text chat, public reviews or review markup, Apple/Google Wallet,
subdomains per shop, Unsplash, `**` image hosts, Serwist, precaching menus.

## States to show

Blueprint A 4.2 plus: no banners (brand card), one banner (no dots), YouTube slide offline (thumbnail only),
announcement ended (hidden), location denied (zones list stays), reward item sold out, claim pending/given, proof
uploading/failed/rejected, delivery without link, rating sent, push denied, push not supported, iOS not installed.

## Done when (agent in its browser, then the founder on a phone with both demo shops)

- Both demo shops show real photos everywhere, 3 banners, an announcement and an about text, after `pnpm local reset`
  and `pnpm local demo`, with no image from outside our storage except YouTube thumbnails.
- A pasted image link to a private address (for example `http://127.0.0.1/x.png`) is refused; a public JPEG is stored
  and shown.
- Juan's member with 10 stamps gets the free item at ₱0 net; Tala's member claims the tote bag, the owner marks it
  given.
- Owner sets Lalamove + link; the customer's receipt shows "Track your delivery" and the rider.
- Proof upload appears as a message in both apps; the owner's approval appears as a system line live.
- A completed order can be rated once; Reports shows the average.
- On Android Chrome (localhost or preview with HTTPS), "Notify me" then "Ready" on the dashboard shows a push; airplane
  mode shows the offline page.
- Lighthouse mobile Performance 90 or more on `/juans-cafe` and `/juans-cafe/menu` (local production build).
- `pnpm check` and `pnpm build` green, 0 console errors.

## Test locally

`pnpm local start`, `pnpm local env local`, `pnpm local reset`, `pnpm local demo`, `pnpm dev` (`next dev
--experimental-https` for push), owners linked with `pnpm local owner`. Generate local VAPID keys with
`pnpm --filter @smartapp/api exec web-push generate-vapid-keys` into your own `.env.local` (never committed).

## Founder by hand (list these in the PR)

Vercel env vars for VAPID and the dispatch secret; Supabase Vault secrets `push_dispatch_url` and
`push_dispatch_secret` on the live project; `pnpm demo:media --target live` once after merge. Exact click steps in the
PR body.

## Finish

`pnpm check` and `pnpm build` green; screenshots at 390 and 1280 for both shops (home, menu, item, receipt with thread
and delivery, rewards) and the new dashboard screens (light and dark at 1280); tick SF3 in `docs/PROGRESS.md`, one
`docs/CHANGELOG.md` line, `docs/api-surface.md` updated; push the branch, open a PR into `dev`; never push `dev`,
`next` or `main`; reply with the 5 lines and the PR link.
