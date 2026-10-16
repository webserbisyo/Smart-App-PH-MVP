# SF2 Storefront database

Track A, storefront v2 prompt 2 of 4. Backend only: migrations, SQL functions, pgTAP tests, `packages/core` schemas,
`packages/api` reads, writes and hooks. No screens (SF3 builds them).

To run it, paste this one line into Antigravity:
`Read @AGENTS.md and @docs/prompts/SF2-storefront-database.md and do exactly that prompt.`

**Runs after** SF1 is merged into `dev`.

## Read first

`AGENTS.md`, `docs/storefront-v2.md` sections 4 and 6 (the data list is the scope), `docs/agent-reference.md`
"Database rules", `docs/api-surface.md`, `docs/decisions.md` "Phase 5" and "Storefront v2", the migrations
`20261012010000_settings_and_catalog.sql`, `20261012030000_storefront_read.sql`, `20261012040000_orders.sql`,
`20261012050000_owner_orders.sql`, `20261012060000_members_and_stamps.sql`, and `supabase/tests/database/*`.

## Goal

Every new storefront feature has its tables, rules and API in place, proven by tests, without breaking the live app.

Branch: `ag/sf2-storefront-database` from the latest `dev`.

## Safety rule for this prompt (read twice)

Merging into `dev` runs `db-deploy`, which applies the migration to the **live** database while the current apps keep
running. So every change is **additive and backward compatible**:
- New columns are nullable or have a default; no column is renamed, retyped or dropped; no `not null` on existing rows
  without a default.
- New `check` constraints only on new columns. Redefined functions keep their name, arguments and every existing
  output key; they may only add keys.
- New tables have RLS on, explicit grants, policies and a cross-shop pgTAP test in the same file set.
- One migration file per step below (`pnpm exec supabase migration new <name>`), newer than the newest file. Never
  edit an applied migration. Work only on the local stack; never write to the hosted project.

## Build only (one commit per step, each with its pgTAP file `supabase/tests/database/08_...` onward)

1. **Shop content.** `shop_settings`: `announcement_text` (≤ 160), `announcement_tone` (`info` default, `promo`,
   `warning`), `announcement_ends_at`, `about_text` (≤ 600), `google_review_url` (https, host `g.page`,
   `search.google.com` or `maps.app.goo.gl`, else null). New `shop_banners` (`tenant_id`, `kind` `image`|`youtube`,
   `image_path`, `youtube_id` (11 chars, `^[A-Za-z0-9_-]{11}$`), `title` ≤ 60, `link_url` https or null, `sort`,
   `is_active`; at most 3 active per shop, enforced by a trigger). Owner grants like `payment_accounts` (column-level
   update). `delivery_zones`: `center_lat` (−90..90), `center_lng` (−180..180), both or neither.
   `get_storefront` adds `announcement` (only while not ended), `about`, `googleReviewUrl`, `banners` (active, sorted)
   and each zone's `center`. Commit `feat(sf2): shop content, banners, zone centres`.
2. **Rewards.** `loyalty_rules`: `reward_kind` (`discount` default, `free_item`, `custom`), `reward_item_id`,
   `reward_variant_id` (composite FKs to the same shop), `reward_title` ≤ 60, `reward_description` ≤ 200,
   `reward_image_path`; a check that `free_item` has an item and variant and `custom` has a title. `order_items`:
   `is_reward boolean default false`. `loyalty_ledger`: `claim_id` nullable. New `reward_claims` (`tenant_id`,
   `customer_id`, `code` 6 characters unique per shop, `status` `pending`|`given`|`cancelled`, `created_at`,
   `given_at`, `cancelled_at`). Rules in SQL:
   - `build_order` / `place_order` / `quote_order` with `useReward`: `discount` as today; `free_item` adds the reward
     variant as a line (`is_reward`, qty 1, normal price) and a discount equal to its price; sold out = clear error
     `reward_item_sold_out`; `custom` is refused (`reward_not_for_orders`).
   - New `claim_reward(p_slug)` (signed-in member, card on, kind `custom`, balance ≥ stamps needed, no pending claim):
     ledger `redeemed` −N with `claim_id`, returns the code. New owner `settle_reward_claim(p_claim_id, p_given boolean)`:
     `given` sets the time; cancel writes `reversed` +N.
   - `get_storefront` `stampRule` and `get_my_account` add `rewardKind`, title, description, image and the free item's
     name; `get_my_account` adds the open claim.
   Commit `feat(sf2): three reward kinds and custom-prize claims`.
3. **Order messages.** New `order_messages` (`tenant_id`, `order_id`, `sender` `customer`|`owner`|`system`, `kind`
   `text`|`image`|`payment_proof`|`status`, `body` ≤ 500, `attachment_path`, `payment_id`, `created_at`); no direct
   writes from clients. `submit_payment_proof` also inserts a `payment_proof` message; `review_payment`,
   `record_payment`, `advance_order`, `cancel_order` insert `system` lines (word keys, not sentences: e.g.
   `payment_confirmed`, `status:ready`). New `get_order_messages(p_token)` (anon, by token) and the owner reads through
   RLS. The `order:<token>` broadcast gets event `message_added`. Backfill existing proofs as messages in the same
   migration. Commit `feat(sf2): order messages with payment proof first`.
4. **Delivery and ratings.** `orders`: `delivery_provider` (`own`|`lalamove`|`grab`|`other`), `rider_name` ≤ 60,
   `rider_phone` (PH mobile). New owner `set_delivery_info(p_order_id, p_provider, p_tracking_url, p_rider_name,
   p_rider_phone)`, delivery orders only; tracking host must match the provider (`lalamove`: `*.lalamove.com`, `grab`:
   `*.grab.com`; `own`/`other`: any https); the allowlist also lives in core (`trackingHostOk`) with shared test cases.
   `get_order` adds provider, rider, `rating`. New `order_ratings` (`order_id` pk, `tenant_id`, `stars` 1..5, `comment`
   ≤ 300, `created_at`); `rate_order(p_token, p_stars, p_comment)` only when completed, once. `get_sales_report` adds
   `ratingAverage` and `ratingCount` for the range. Commit `feat(sf2): delivery info and private ratings`.
5. **Push.** New `push_subscriptions` (`id`, `endpoint` unique, `p256dh`, `auth`, `customer_id` nullable,
   `created_at`, `last_used_at`), `order_push_subscriptions` (`order_id`, `subscription_id`), and
   `notification_outbox` (`id`, `tenant_id`, `subscription_id`, `payload` jsonb, `status` `queued`|`sent`|`failed`,
   `attempts`, `created_at`, `sent_at`). `subscribe_order_push(p_token, p_subscription jsonb)` (anon, by token; also
   stores a `consents` row channel `push`, purpose transactional). A trigger on order status change queues one outbox row
   per linked subscription with `{ title, body, url }` built from word keys. Dispatch: when Vault secrets
   `push_dispatch_url` and `push_dispatch_secret` exist, the trigger also calls `net.http_post` (pg_net) to that URL
   with the secret header; when they do not exist it only queues (local default). `claim_push_batch(p_secret, p_limit)` and
   `finish_push(p_secret, p_id, p_ok, p_gone)` check `p_secret` against the Vault secret and refuse otherwise, so the
   dispatch route needs no service-role key (decision SF-16). Commit `feat(sf2): push subscriptions and outbox`.
6. **Types and API.** `pnpm db:types`; Zod schemas in `packages/core/src/schemas/` (one file per shape: banner,
   announcement, reward rule, reward claim, order message, rating, delivery info, push subscription); mappers and hooks
   in `packages/api/src/<area>/` (`useShopBanners`, `useSaveShopBanners`, `useClaimReward`, `useSettleRewardClaim`,
   `useOrderMessages` with live refresh, `useRateOrder`, `useSetDeliveryInfo`, `subscribeOrderPush`); server-only
   `packages/api/src/push/server.ts` stub for SF3 (no `web-push` yet). Update `docs/api-surface.md` for every new or
   changed name. Commit `feat(sf2): schemas, API and hooks`.

## Do not build

Screens, the service worker, the dispatch route, `web-push`, Lalamove API calls, SMS, campaigns, free-text chat,
public reviews, review markup. No change to existing columns or constraints.

## Tests (pgTAP plus Vitest)

Per step: cross-shop isolation (shop A's owner cannot read or write shop B's rows), anon can only reach rows through
the token functions, every check constraint, and the happy path. Rewards: free item adds one ₱0-net line and returns on
cancel; custom claim takes stamps once, cancel returns them, a second pending claim is refused. Ratings: only after
completed, only once. Delivery: wrong host for the provider is refused. Push: a status change queues one row per
linked subscription; nothing is called when Vault secrets are missing. Core: `trackingHostOk` cases shared with SQL.
Existing tests 01 to 07 still pass unchanged.

## Done when

- `pnpm local reset`, `pnpm db:test`, `pnpm check`, `pnpm build` green; `database.types.ts` committed and CI type diff
  clean.
- The current storefront and dashboard still work unchanged against the migrated local database (open both demo shops,
  place a GCash order, upload a proof, approve it, complete it).
- `docs/api-surface.md` lists every new or changed function and hook.

## Test locally

`pnpm local start`, `pnpm local reset`, `pnpm local demo`, `pnpm db:test`, `pnpm dev`; Studio
http://localhost:54323 to look at rows (`docs/local-dev.md`).

## Finish

Screenshots are not needed (no screens); paste the `pnpm db:test` summary in the PR instead. Tick SF2 in
`docs/PROGRESS.md` (2 log lines), one `docs/CHANGELOG.md` line, list every new table and function in the PR body under
"Database"; push the branch, open a PR into `dev`; never push `dev`, `next` or `main`; reply with the 5 lines and the
PR link. The founder merges only after reading the "Database" list, because the merge deploys it live.
