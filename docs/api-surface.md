# API surface (packages/api)

Every name the apps may call from `@smartapp/api`, grouped by area, and the SQL function behind each write.
Screens call only these names. A PR that adds, renames or changes a hook, a plain function or a `public.` SQL
function updates this file in the same PR. Types are the Zod types in `@smartapp/core` (camelCase).
Last checked against `packages/api/src` and `supabase/migrations`: 2026-10-15.

## Conventions

- **Clients.** Apps create the client and pass their env in; `packages/api` never reads env.
  - Dashboard: `createDashboardClient({ url, publishableKey })`.
  - Storefront: `createStorefrontServerClient(env, cookies)` (server components, `getClaims()`),
    `createStorefrontBrowserClient(env)` (client components), `createPublicClient(env)` (no session; shop pages, cacheable).
- **Provider.** `<ApiProvider client={...}>` wraps each app inside its `QueryClientProvider`. Hooks read the client from it.
- **Plain functions and hooks.** Every read exists twice: a plain async function taking the client first
  (`getStorefront(client, slug)`, used by Next server components) and a hook (`useStorefront(slug)`).
  Every write is a plain function plus a `useXxx()` mutation hook that invalidates the right keys.
- **Query keys.** One file, `packages/api/src/keys.ts`, exported as `qk`. Screens never build keys by hand.
- **Errors.** Every failure becomes `ApiError { code: ApiErrorCode, detail: string | null }`.
  `ApiErrorCode` and its words live in `packages/core/src/contracts/errors.ts` (`errorWords(code, vocab)`), so
  screens show `WORDS`-file text, never raw database messages. Unknown errors map to `unknown`.
  `detail` carries the offending id when there is one (`item_unavailable`, `out_of_stock`).
- **Parsing.** Every row and RPC result is parsed with its core Zod schema before it reaches a screen. No casts.
- **Money** in centavos, **times** as ISO strings (UTC); display formatting is in core (`formatPeso`, `formatManila…`).
- **Images.** Compression is browser code in `packages/ui/src/lib/compress-image.ts` (`compressImage(file, { maxSize })`).
  Upload helpers in `packages/api` take the
  already-compressed `Blob`. Public image URLs come from `mediaUrl(path, size)`; `size` is `'full' | 'thumb'`.
- **Loading, empty, error.** Hooks are plain TanStack Query results; screens own those three states.

## 0. Auth and shop

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useSignUpOwner()` | mutation | `{ name, email, password }` | sends the 6-digit code |
| `useVerifyEmailCode()` | mutation | `{ email, code }` | signs in (`verifyOtp` type `email`) |
| `useResendEmailCode()` | mutation | `{ email }` | |
| `useSignIn()` / `useSignOut()` | mutation | `{ email, password }` / none | |
| `useSendPasswordResetCode()`, `useResetPasswordWithCode()` | mutation | `{ email }`, `{ email, code, newPassword }` | in-app, no links |
| `useSendCustomerCode()`, `useVerifyCustomerCode()` | mutation | `{ email }`, `{ email, code }` | storefront |
| `useSession()` | query | none | `{ userId, email } \| null` |
| `useMyShop()` | query | none | `Tenant \| null` (`qk.myShop`) |
| `useSlugAvailable(slug)` | query | `Slug` | `boolean` (debounce in the screen) |
| `useCreateMyShop()` | mutation | `{ businessType, name, slug }` | `Tenant` (`create_my_shop`) |
| `useShopId()` | hook | none | the signed-in owner's shop id, for the dashboard queries |

Error codes: `already_has_shop`, `slug_taken`, `slug_reserved`, `slug_invalid`, `invalid_code`, `code_expired`,
`email_taken`, `weak_password`, `wrong_password`, `rate_limited`, `not_signed_in`.

## 1. Settings, catalog, uploads (dashboard)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useShopSettings(tenantId)` | query | | `ShopSettings` |
| `useUpdateShopSettings()` | mutation | `ShopSettingsPatch` (`Partial<ShopSettings>` without `tenantId`) | `ShopSettings` |
| `useUpdateShopName()` | mutation | `{ name }` | `Tenant` |
| `useBusinessHours(tenantId)`, `useSaveBusinessHours()` | query, mutation | `DayHours[]` (whole week replaced; days left out are closed) | `BusinessHours[]` |
| `useClosures`, `useAddClosure`, `useRemoveClosure` | | `{ closedOn, note }`, `{ closedOn }` | |
| `usePaymentAccounts`, `useSavePaymentAccount`, `useRemovePaymentAccount` | | `PaymentAccountDraft` (`id: null` for new), `{ accountId }` | removing deletes its QR image |
| `useDeliveryZones`, `useSaveDeliveryZone`, `useRemoveDeliveryZone` | | `DeliveryZoneDraft`, `{ zoneId }` | |
| `useCategories`, `useSaveCategory`, `useRemoveCategory` | | `CategoryDraft` (with `icon`), `{ categoryId }` | remove refuses a category with items: `category_not_empty` |
| `useCatalog(tenantId)` | query | | `CatalogItem[]`: item + photos + variants + option group ids, all statuses |
| `useSaveItem()` | mutation | `ItemDraft` (item, variants ≥ 1, photo paths in order, option group ids) | `CatalogItem`, one transaction (`save_item`) |
| `useSetItemStatus()` | mutation | `{ itemId, status }` | active / hidden / archived |
| `useDeleteItem()` | mutation | `{ itemId }` | an item with orders raises `item_has_orders` (archive it instead) |
| `useSetVariantSoldOut()` | mutation | `{ variantId, isSoldOut }` | |
| `useSetStock()` | mutation | `{ variantId, stockOnHand }` (0 or more) | `set_stock` (logged) |
| `useOptionGroups`, `useSaveOptionGroup`, `useRemoveOptionGroup` | | `OptionGroupDraft` with options in order, `{ groupId }` | |
| `useSaveSortOrder()` | mutation | `{ kind: 'categories' \| 'items' \| 'variants' \| 'photos' \| 'paymentAccounts' \| 'deliveryZones', ids }` | drag to sort |
| `uploadShopMedia(client, tenantId, kind, { full, thumb })` | function | `kind`: `logo \| cover \| item \| category \| qr` (`MediaKind`) | `{ path }` (the full size; the thumb is `-thumb.webp` beside it) |
| `mediaUrl(path, size)` | function | | public URL (works once the app has created its client) |

`Category.icon` is `{ kind: 'fluent', key } | { kind: 'emoji', value } | { kind: 'image', path } | null` (rendered by the `CategoryIcon` pattern).
Queries take the shop id; the mutations act on the signed-in owner's shop (`useMyShop`). Drafts (`ItemDraft`,
`CategoryDraft`, `PaymentAccountDraft`, `DeliveryZoneDraft`, `OptionGroupDraft`, `DayHours`, `ShopSettingsPatch`) are
core Zod schemas. Removing a photo, logo, QR or photo icon also deletes the file. Error codes: `invalid`,
`variant_required`, `category_not_empty`, `not_allowed`.

## 2. Storefront read

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `getStorefront(client, slug)` / `useStorefront(slug)` | query | `Slug` | `Storefront` or `null` (unknown, pending or suspended shop: the page shows not found) |

`Storefront` = `PublicShop` (tenant without `plan`, `paidUntil`, `status`) + settings, `isOpen`, `hours`,
`closures`, visible `categories`, visible `items` (photos, variants not archived, option groups), active payment
accounts and zones, `stampRule` (null when off), `memberCount` (null when hidden). Open/closed text such as
"Open until 9 PM" or "Opens 7 AM tomorrow" comes from `openState(hours, closures, now)` in core; `isOpen` from the
database is what ordering obeys. The cart is client-side (localStorage per shop slug, `CartLine[]`), always
re-priced with `quote_order` before Place order.

Pickup time slots (`pickupSlots(hours, closures, now)` in core) must follow the database rule:
at least 15 minutes ahead, today or tomorrow in Manila time, inside business hours, not on a closed day (the first
slot is 20 minutes out and the last is 15 minutes before closing). The Messenger text
(`messengerOrderText(order, lines, trackUrl, now)`, with `messengerLink(username, text)`) is also core.

## 3. Checkout and receipt

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useQuote(slug, payload)` | query | `QuotePayload` (choices only), or `null` to wait | `Quote`; `problems[]` (`lineIndex`, `code`, `variantId`) for line issues; shop-level issues are errors |
| `usePlaceOrder()` | mutation | `{ slug, payload }` (`OrderInput`: `OrderPayload` without `clientKey`) | `{ orderId, orderNo, token }`; the hook keeps one `clientKey` per checkout, so a retry is safe |
| `useOrder(token)` | query | token | `OrderReceipt`, or `null` for an unknown link (`qk.order(token)`) |
| `useOrderLive(token)` | effect hook | token | joins public channel `order:<token>`, refetches `useOrder` on each change; polls every 15 s while not joined |
| `uploadPaymentProof(client, { tenantId, token }, blob)` | function | | `{ path }` (`<tenantId>/<token>/<uuid>.webp`) |
| `useSubmitPaymentProof()` | mutation | `{ token, method, referenceNo, proofPath }` | `Payment` |
| `useMyOrderTokens(slug)` | hook | | tokens this device placed (localStorage), for the guest Orders tab |

Error codes: `shop_closed`, `shop_busy`, `shop_not_found`, `fulfillment_unavailable`, `payment_unavailable`,
`cod_not_allowed`, `pickup_time_invalid`, `zone_required`, `zone_invalid`, `item_unavailable`, `out_of_stock`,
`invalid_options`, `reward_unavailable`, `rate_limited`, `order_not_payable`, `duplicate_reference`,
`proof_missing`, `too_many_proofs`, `not_found`, `invalid`.

## 4. Orders board (dashboard)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useOrders(tenantId, scope)` | query | `scope`: `{ kind: 'open' } \| { kind: 'day', date } \| { kind: 'customer', customerId }` | `BoardOrder[]` (order + lines); `customer`: the last 20, newest first |
| `useOrderDetail(orderId)` | query | | `OrderReceipt \| null` (with the normalised reference; `null` when not the owner's) |
| `useShopOrdersLive(tenantId, { onNewOrder, onToVerify })` | effect hook | | private channel `shop:<tenantId>`; invalidates `qk.orders` and `qk.dashboardToday`; the callbacks drive the chime; polls every 15 s while not joined |
| `useProofUrl(path)` | query | | signed URL, 5 minutes (renewed every 4) |
| `useReviewPayment()` | mutation | `{ paymentId, approve, rejectReason }` | `Payment` |
| `useRecordPayment()` | mutation | `{ orderId, method }` | `Payment` |
| `useAdvanceOrder()` | mutation | `{ orderId, toStatus, trackingUrl }` | `Order` (optimistic) |
| `useCancelOrder()` | mutation | `{ orderId, reason }` | `Order` |

Core rules the board uses (`packages/core/src/order-rules.ts`, kept in line with the SQL): `boardColumn(order)`,
`nextActions(order, settings)` (the main step first: `verify_payment`, `mark_paid`, `start`, `mark_ready`, `out_for_delivery`, `complete`), `canCancel(order)`, `timelineSteps(order, events)`, `isLate(order, now)`. A core test proves every open order can be finished. Steps only move forward: there is no Undo.

Error codes: `not_allowed`, `not_found`, `invalid_transition`, `item_has_orders`, `not_paid`, `payment_not_pending`, `already_paid`; also `invalid`, `payment_unavailable` (`cod` on a non-delivery order, `cash` on delivery) and `order_not_payable` (a cancelled or expired order).

## 5. Members and stamps

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useJoinAsMember()` | mutation | `{ slug, name, phone, orderToken }` | `MemberAccount`; `orderToken` is any token this device holds for the shop (links past guest orders); `null` sends the newest one this device holds. A first join on a shop with an active stamp card includes 1 welcome stamp (decision P5-16 in `docs/decisions.md`). Joining again returns the same account, not an error |
| `useMyAccount(slug)` | query | | `MemberAccount \| null` (null: signed in but not a member here; waits while signed out). `MemberAccount.history` is the latest 20 stamp movements |
| `useSaveMyAddress(slug)`, `useRemoveMyAddress(slug)` | mutation | `AddressInput` (`CustomerAddress` with `id: null` to add), address id | refresh `useMyAccount(slug)` |
| `useStampRule(tenantId)`, `useSaveStampRule()` | query, mutation | `StampRule` | dashboard |

Error codes: `not_signed_in`, `phone_needs_order`, `phone_in_use`; `reward_unavailable` comes from `useQuote` and `usePlaceOrder` when `useReward` is set.

## 6. Home, customers, reports (dashboard)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useDashboardToday(tenantId)` | query | | `DashboardToday` |
| `useMemberInsights(tenantId)` | query | | `MemberInsights` |
| `useSalesReport(tenantId, { from, to })` | query | Manila dates | `SalesReport`: days, totals `{ orders, paidOrders, sales }`, best sellers |
| `useCustomers(tenantId, { search, membersOnly })` | infinite query | | `data`: `CustomerRow[]` (customer + stamp balance) loaded so far, newest order first, 50 per page; `hasNextPage` / `fetchNextPage` for "Load more". Search matches a name or a mobile (`09…`, `+63…`, `9…`) |
| `useUpdateCustomerNotes()` | mutation | `{ customerId, notes, tags }` | `Customer`; refreshes the shop's customer lists |
| `exportOrdersCsv(client, tenantId, { from, to })` | function | | CSV `Blob` (Manila times, pesos), one row per order; file name from `WORDS.dashboard.reports.csv.fileName(from, to)` |
| `exportCustomersCsv(client, tenantId, { search, membersOnly })` | function | | CSV `Blob` of every customer the filter finds; file name from `WORDS.dashboard.customers.csv.fileName(date)` |

Error codes: `not_allowed`, `invalid` (a range over 92 days, or `from` after `to`).

## Realtime channels

| Channel | Who joins | Sent when | Payload |
| --- | --- | --- | --- |
| `order:<token>` (public) | the receipt page | the order's status or payment status changes | `{ status, paymentStatus }` |
| `shop:<tenantId>` (private, RLS: shop members) | the dashboard | an order is placed or changes | `{ orderId, op: 'insert' \| 'update', status, paymentStatus }` |

Payloads are only a nudge: the hook refetches through the normal queries, so RLS still decides what is read.

## SQL functions behind the API

Writes and anything touching money, stock or stamps go through these `public.` functions (`security definer`,
`set search_path = ''`); everything else is a plain table read or write under RLS. Helpers live in the
`private` schema and are never called from the apps.

| File in `packages/api/src` | `public.` functions |
| --- | --- |
| `shops/shops.ts` | `slug_available`, `create_my_shop` |
| `catalog/catalog.ts` | `save_item`, `set_stock`, `save_sort_order` |
| `storefront/storefront.ts` | `get_storefront` |
| `orders/orders.ts` | `quote_order`, `place_order`, `get_order`, `submit_payment_proof` |
| `board/board.ts` | `review_payment`, `record_payment`, `advance_order`, `cancel_order` |
| `members/members.ts` | `join_as_member`, `get_my_account` |
| `reports/reports.ts` | `get_dashboard_today`, `get_member_insights`, `get_sales_report` |

Database-only helpers worth knowing: `private.demo_setup()` and `private.demo_reset(slug)` (demo shops, run as the
database owner), `private.expire_unpaid_orders()` (cron job).
