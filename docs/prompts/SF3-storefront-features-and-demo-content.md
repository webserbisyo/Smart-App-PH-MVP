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
2. **Product photos, several at once (dashboard product editor).** Replace the one-at-a-time `EditorPhotos` with
   `PhotoGallery` (SF1 upload rules; layout `c-file-upload-4` grid + `c-file-upload-8` sorting, plus the summary row of
   `c-file-upload-5` "Progress List"). The owner picks or drops several photos in one go (only as many as the free
   slots up to `MAX_PHOTOS` 5; extra ones get a words.ts message). Each photo: crop at the vocab ratio (1:1 food, 4:5
   apparel; the owner may confirm all with the default centre crop), `compressImage` with `IMAGE_SIZES.photo` and
   `thumb`, then the real upload, at most 2 at a time (slow data). Each tile shows its own real percent and Retry or
   Remove; above the grid one total bar (average of the photos' real percents) and the line "2 of 4 uploaded, 1 failed"
   from `words.ts`, with "Retry failed" when any failed. Save stays disabled while any photo is uploading. First photo
   is the cover; drag to reorder. Commit `feat(sf3): product photos, several at once`.
3. **Image links, imported safely.** Route handler `apps/storefront/src/app/api/media/import/route.ts` with the logic in
   `packages/api` (server): owner's JWT required and must own the shop; https only; resolve DNS and refuse private,
   loopback and link-local addresses (also after redirects, max 2); `content-type` jpeg, png or webp checked against
   the file's first bytes; max 2 MB; 8 s timeout; stored in `shop-media/<tenant>/imported/<uuid>.<ext>`; returns the
   path. Never hotlink, never widen `images.remotePatterns` beyond the Supabase host and `i.ytimg.com`. Commit
   `feat(sf3): import image links into storage`.
4. **Area, location and delivery pins (decisions SF-8, SF-26).** The browser's own location only (Geolocation API,
   free, no map service, no API key). Ask only on a tap, never on page load; one `getCurrentPosition`
   (`enableHighAccuracy`, 10 s timeout, `maximumAge` 60 s), never `watchPosition`.
   - `AreaPill` sheet: "Use my location" suggests the nearest zone with a centre point by `distanceKm` (suggestion
     only, the customer confirms) and keeps the position for checkout in memory for this visit only.
   - Checkout address form (delivery): "Use my current location" button with one line of consent copy above it from
     `words.ts` ("We'll send your pin to the shop with this order so the rider can find you."). After Allow: "Pin
     added" with the accuracy ("about 30 m"; above 100 m add "add a landmark") and "Remove pin". The typed address
     stays required (landmark optional, as today); the pin is optional and sent as `delivery.pin` only if still set when the order is
     placed. Denied, unavailable or timed out: one calm line and the form works as before.
   - Saved addresses (account and checkout): optional pin with the same button; picking a saved address with a pin
     uses it; "Remove pin" on edit.
   - Receipt and Messenger: `messengerOrderText` and "Copy order details" add a "Pin:" line with `mapsLink(pin)` when
     the order has one; the receipt shows the address with "Open in Google Maps".
   - Dashboard order detail and the delivery card on the board: "Open in Google Maps" (the same link) and
     "~2.4 km from the shop (straight line)" from `distanceKm(shopPin, deliveryPin)`; hidden when either pin is
     missing; the label always says straight line.
   - Dashboard Settings (shop details): "Shop location" with "Use my current location here" (the owner stands in the
     shop) or "Paste a Google Maps link" (`pinFromMapsLink`; a short `maps.app.goo.gl` link gets the words "Open the
     link, then copy the long address from the browser"), a "Check on Google Maps" link to confirm, and "Remove".
     Order types: optional zone centre the same way (paste a link or type the numbers).
   - Privacy page (built in SF1): add one words.ts line that the delivery pin is used only for that order or saved
     address and can be removed.
   Commit `feat(sf3): area, nearest zone and delivery pins`.
5. **Rewards.** Dashboard Stamp card screen: reward kind (discount, free item with item and variant picker, custom
   prize with title, description and picture via `PhotoField`), live `RewardCard` preview; Customers sheet: open claims
   with Given / Cancel. Storefront: `RewardCard` shows the reward picture or item; checkout reward switch for discount
   and free item; Rewards tab "Claim prize" for custom (QR + 6-character code, pending state, given state). Commit
   `feat(sf3): three reward kinds on screen`.
6. **Order thread, delivery, rating.** Receipt: `OrderThread` (shadcn `message`, `bubble`, `attachment`) with the
   payment proof as the customer's message (`ProofDrop` per the SF1 upload rules: camera or gallery, compress, real upload with progress and Retry, reference number) and system
   lines in words; "Track your delivery" button and rider name/phone (`tel:`) when set; `RatingField` (DiceUI `rating`
   + comment) once completed. Dashboard order detail: the same thread, a Delivery card (provider, link, rider; replaces
   the tracking dialog flow), the rating read-only; Reports: rating average and count. Commit `feat(sf3): order thread,
   delivery tracking, ratings`.
7. **Service worker and push.** Add `web-push` 3.6.7 and `@types/web-push` 3.6.4 to `packages/api` (approved, decision
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
8. **SEO and speed.** `opengraph-image` per shop (logo, name, palette), `LocalBusiness` JSON-LD from shop data (the
   schema type word comes from vocab; no ratings), `sitemap.ts` of active shops, canonical URLs, `robots.ts`. Replace
   `force-dynamic` with cached shop data per slug tagged `shop:<slug>`; a revalidate route checks the owner's JWT and
   refreshes the tag; `packages/api` calls it after every owner save that changes storefront data (stock and prices
   stay safe: `quote_order` re-checks at checkout). Commit `feat(sf3): SEO and cached shop pages`.
9. **Demo content (the two demo shops only).** About 30 Pexels photos (license allows re-hosting; credits file
   required), chosen by hand: juans-cafe (17 items, 4 category photos optional, logo, 3 banners: coffee, pastries,
   rice meal), tala-apparel (14 items, logo, 3 banners: new arrivals, dresses, accessories). Convert to WebP at
   `IMAGE_SIZES` (photo 1600 px max, 300 KB; thumb 400; logo 512 square) plus `-thumb`. Commit them to
   `supabase/demo-media/<slug>/` with `supabase/demo-media/CREDITS.md` (photo URL, photographer, Pexels license link).
   No Unsplash files. Storage path `demo/<slug>/<file>.webp` in `shop-media`. Upload: local via `config.toml`
   `[storage.buckets.shop-media] objects_path` if it works with the migration-created bucket, else a script
   `packages/api/scripts/demo-media.ts` (`pnpm demo:media --target local|live`, reads `SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` from the shell, never from files). New migration: `private.demo_seed_catalog` and
   `demo_reset` set logo, cover, item photos, banners (one YouTube slide in juans-cafe), announcement, about, review
   link, zone centres, a shop pin for both shops, a pin on a few delivery orders, the free-item reward for juans-cafe
   and the custom prize (tote bag) for tala-apparel, a few ratings and order threads. Only `is_demo` shops are touched; no demo data in app code. Commit `feat(sf3): demo photos
   and content for both demo shops`.

## Do not build

Lalamove API, SMS, owner campaign sending, free-text chat, public reviews or review markup, Apple/Google Wallet,
subdomains per shop, Unsplash, `**` image hosts, Serwist, precaching menus, a map picker or embedded map, address
autocomplete, road distance or fees by distance, any paid or keyed map API, live rider tracking.

## States to show

Blueprint A 4.2 plus: no banners (brand card), one banner (no dots), YouTube slide offline (thumbnail only),
announcement ended (hidden), location denied (zones list stays, address form works), pin added (with accuracy), pin
with low accuracy (landmark hint), pin removed, order without pin (no km line), shop pin not set (no km line), reward
item sold out, claim pending/given, proof
uploading/failed/rejected, product photos (3 uploading with the total bar, 1 failed with Retry, gallery full at 5), delivery without link, rating sent, push denied, push not supported, iOS not installed.

## Done when (agent in its browser, then the founder on a phone with both demo shops)

- Both demo shops show real photos everywhere, 3 banners, an announcement and an about text, after `pnpm local reset`
  and `pnpm local demo`, with no image from outside our storage except YouTube thumbnails.
- The owner picks 4 product photos at once on a phone: each is shrunk before upload (under 300 KB in Storage), the
  total bar and "x of 4 uploaded" move with the real uploads, a failed one retries alone, Save waits for all.
- A pasted image link to a private address (for example `http://127.0.0.1/x.png`) is refused; a public JPEG is stored
  and shown.
- Juan's member with 10 stamps gets the free item at ₱0 net; Tala's member claims the tote bag, the owner marks it
  given.
- Owner sets Lalamove + link; the customer's receipt shows "Track your delivery" and the rider.
- A delivery order placed with "Use my current location" carries the pin: the Messenger text has the Google Maps
  link, the dashboard order opens it in Google Maps and shows the straight-line km from the shop pin; denying the
  location prompt still lets the customer order.
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
