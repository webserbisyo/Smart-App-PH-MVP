# API surface (packages/api)

What the screens (P4.0 to P4.7) can rely on, slice by slice. The backend checkpoints (P3b, P5.1 to P5.6) build exactly
these names; the screen checkpoints call only these. If a name must change, change it here first and tell the
other thread. Types are the Zod types in `@smartapp/core` (camelCase). Last updated 2026-10-11.

## Run order (vertical slices)

| Slice | Backend checkpoint | Then the screens |
| --- | --- | --- |
| 0 | P3a database (shops, owners, RLS), P3b auth + guards | (auth screens are in P3b) |
| 1 | P5.1 settings, catalog, storage, uploads | P4.0 shared parts (can run any time after P3b), P4.1 Products, P4.2 Settings |
| 2 | P5.2 `get_storefront`, demo shops (catalog), shop manifest | P4.3 storefront home, menu, item sheet, cart |
| 3 | P5.3 order engine + live order updates | P4.4 checkout + receipt |
| 4 | P5.4 owner order handling, expiry job, audit log | P4.5 orders board + order detail |
| 5 | P5.5 members and stamps | P4.6 member sign-in sheet, member card, my orders |
| 6 | P5.6 home numbers, reports, CSV, `demo_reset` | P4.7 dashboard Home, Customers, Reports |

## Conventions (all slices)

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
- **Images.** Compression is browser code in `packages/ui/src/lib/image.ts` (`compressImage(file, { maxSize })`,
  copied and trimmed from `reference/packages/ui/src/lib/crop-image.ts`). Upload helpers in `packages/api` take the
  already-compressed `Blob`. Public image URLs come from `mediaUrl(path, size)`; `size` is `'full' | 'thumb'`.
- **Loading, empty, error.** Hooks are plain TanStack Query results; screens own those three states.

## Slice 0: auth and shop (P3b)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `signUpOwner` | mutation | `{ name, email, password }` | sends the 6-digit code |
| `verifyEmailCode` | mutation | `{ email, code }` | signs in (`verifyOtp` type `email`) |
| `resendEmailCode` | mutation | `{ email }` | |
| `signIn` / `signOut` | mutation | `{ email, password }` / none | |
| `sendPasswordResetCode`, `resetPasswordWithCode` | mutation | `{ email }`, `{ email, code, newPassword }` | in-app, no links |
| `sendCustomerCode`, `verifyCustomerCode` | mutation | `{ email }`, `{ email, code }` | storefront |
| `useSession()` | query | none | `{ userId, email } \| null` |
| `useMyShop()` | query | none | `Tenant \| null` (`qk.myShop`) |
| `useSlugAvailable(slug)` | query | `Slug` | `boolean` (debounce in the screen) |
| `useCreateMyShop()` | mutation | `{ businessType, name, slug }` | `Tenant` |

Error codes: `already_has_shop`, `slug_taken`, `slug_reserved`, `slug_invalid`, `invalid_code`, `code_expired`,
`email_taken`, `weak_password`, `wrong_password`, `rate_limited`, `not_signed_in`.

## Slice 1: settings, catalog, uploads (P5.1, dashboard)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useShopSettings(tenantId)` | query | | `ShopSettings` |
| `useUpdateShopSettings()` | mutation | `Partial<ShopSettings>` (no `tenantId`) | `ShopSettings` |
| `useUpdateShopName()` | mutation | `{ name }` | `Tenant` |
| `useBusinessHours(tenantId)`, `useSaveBusinessHours()` | query, mutation | `BusinessHours[]` (whole week replaced) | |
| `useClosures`, `useAddClosure`, `useRemoveClosure` | | `{ closedOn, note }` | |
| `usePaymentAccounts`, `useSavePaymentAccount`, `useRemovePaymentAccount` | | `PaymentAccount` without ids for new | |
| `useDeliveryZones`, `useSaveDeliveryZone`, `useRemoveDeliveryZone` | | `DeliveryZone` | |
| `useCategories`, `useSaveCategory`, `useRemoveCategory` | | `Category` (with `icon`) | remove refuses a category with items: `category_not_empty` |
| `useCatalog(tenantId)` | query | | `CatalogItem[]`: item + photos + variants + option group ids, all statuses |
| `useSaveItem()` | mutation | `ItemDraft` (item, variants ≥ 1, photo paths in order, option group ids) | `CatalogItem`, one transaction (`save_item`) |
| `useSetItemStatus()` | mutation | `{ itemId, status }` | active / hidden / archived |
| `useDeleteItem()` | mutation | `{ itemId }` | from P5.3 on, an item with orders raises `item_has_orders` (archive it instead) |
| `useSetVariantSoldOut()` | mutation | `{ variantId, isSoldOut }` | |
| `useSetStock()` | mutation | `{ variantId, stockOnHand }` | `set_stock`, logged |
| `useOptionGroups`, `useSaveOptionGroup`, `useRemoveOptionGroup` | | `OptionGroup` with options | |
| `useSaveSortOrder()` | mutation | `{ kind: 'categories' \| 'items' \| 'variants' \| 'photos' \| 'paymentAccounts' \| 'deliveryZones', ids }` | drag to sort |
| `uploadShopMedia(client, tenantId, kind, blob)` | function | `kind`: `logo \| cover \| item \| category \| qr` | `{ path }`; uploads `full` and `thumb` |
| `mediaUrl(path, size)` | function | | public URL |

`Category.icon` is `{ kind: 'fluent', key } | { kind: 'emoji', value } | { kind: 'image', path } | null` (docs/ui-kit.md 8).

## Slice 2: storefront read (P5.2)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `getStorefront(client, slug)` / `useStorefront(slug)` | query | `Slug` | `Storefront` or `null` (unknown, pending or suspended shop: the page shows not found) |

`Storefront` = `PublicShop` (tenant without `plan`, `paidUntil`, `status`) + settings, `isOpen`, `hours`,
`closures`, visible `categories`, visible `items` (photos, variants not archived, option groups), active payment
accounts and zones, `stampRule` (null until P5.5), `memberCount` (null when hidden). Open/closed text such as
"Open until 9 PM" or "Opens 7 AM tomorrow" comes from `openState(hours, closures, now)` in core; `isOpen` from the
database is what ordering obeys. The cart is client-side (localStorage per shop slug, `CartLine[]`), always
re-priced with `quote_order` before Place order.

## Slice 3: checkout and receipt (P5.3)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useQuote(slug, payload)` | query | `OrderPayload` (choices only) | `Quote`; `problems[]` by `lineIndex` for line issues; shop-level issues are errors |
| `usePlaceOrder()` | mutation | `{ slug, payload }` | `{ orderId, orderNo, token }`; safe to retry with the same `clientKey` |
| `useOrder(token)` | query | token | `OrderReceipt` (`qk.order(token)`) |
| `useOrderLive(token)` | effect hook | token | joins public channel `order:<token>`, refetches `useOrder` on each change; polls every 15 s while not joined |
| `uploadPaymentProof(client, { tenantId, token }, blob)` | function | | `{ path }` (`<tenantId>/<token>/<uuid>.webp`) |
| `useSubmitPaymentProof()` | mutation | `{ token, method, referenceNo, proofPath }` | `Payment` |
| `useMyOrderTokens(slug)` | hook | | tokens this device placed (localStorage), for the guest Orders tab |

Error codes: `shop_closed`, `shop_busy`, `shop_not_found`, `fulfillment_unavailable`, `payment_unavailable`,
`cod_not_allowed`, `pickup_time_invalid`, `zone_required`, `zone_invalid`, `item_unavailable`, `out_of_stock`,
`invalid_options`, `reward_unavailable`, `rate_limited`, `order_not_payable`, `duplicate_reference`,
`proof_missing`, `too_many_proofs`, `invalid`.

## Slice 4: orders board (P5.4, dashboard)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useOrders(tenantId, scope)` | query | `scope`: `{ kind: 'open' } \| { kind: 'day', date }` | `BoardOrder[]` (order + lines) |
| `useOrderDetail(orderId)` | query | | `OrderReceipt` |
| `useShopOrdersLive(tenantId, { onNewOrder, onToVerify })` | effect hook | | private channel `shop:<tenantId>`; invalidates `qk.orders` and `qk.dashboardToday`; the callbacks drive the chime; polls every 15 s while not joined |
| `useProofUrl(path)` | query | | signed URL, 5 minutes |
| `useReviewPayment()` | mutation | `{ paymentId, approve, rejectReason }` | `Payment` |
| `useRecordPayment()` | mutation | `{ orderId, method }` | `Payment` |
| `useAdvanceOrder()` | mutation | `{ orderId, toStatus, trackingUrl }` | `Order` (optimistic) |
| `useCancelOrder()` | mutation | `{ orderId, reason }` | `Order` |

Core rules the board uses (P5.4 puts them in `packages/core`, matching the SQL): `boardColumn(order)`,
`nextActions(order, settings)` (the main step first: `verify_payment`, `mark_paid`, `start`, `mark_ready`, `out_for_delivery`, `complete`,
), `canCancel(order)`, `timelineSteps(order, events)`, `isLate(order, now)`. A core test proves every open order can be finished.

Error codes: `not_allowed`, `not_found`, `invalid_transition`, `item_has_orders`, `not_paid`, `payment_not_pending`, `already_paid`.

## Slice 5: members and stamps (P5.5)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useJoinAsMember()` | mutation | `{ slug, name, phone, orderToken }` | `MemberAccount`; `orderToken` is any token this device holds for the shop (links past guest orders) |
| `useMyAccount(slug)` | query | | `MemberAccount \| null` (null: signed in but not a member here) |
| `useSaveMyAddress()`, `useRemoveMyAddress()` | mutation | `CustomerAddress` | |
| `useStampRule(tenantId)`, `useSaveStampRule()` | query, mutation | `StampRule` | dashboard |

Error codes: `not_signed_in`, `phone_needs_order`, `already_member`.

## Slice 6: home, customers, reports (P5.6, dashboard)

| Name | Kind | Input | Output / notes |
| --- | --- | --- | --- |
| `useDashboardToday(tenantId)` | query | | `DashboardToday` |
| `useMemberInsights(tenantId)` | query | | `MemberInsights` |
| `useSalesReport(tenantId, { from, to })` | query | Manila dates | `SalesReport` |
| `useCustomers(tenantId, { search, membersOnly })` | query | | `CustomerRow[]` (customer + stamp balance) |
| `useUpdateCustomerNotes()` | mutation | `{ customerId, notes, tags }` | |
| `exportOrdersCsv(client, tenantId, { from, to })` | function | | CSV `Blob` (Manila times, pesos) |

## Realtime channels

| Channel | Who joins | Sent when | Payload |
| --- | --- | --- | --- |
| `order:<token>` (public) | the receipt page | the order's status or payment status changes | `{ status, paymentStatus }` |
| `shop:<tenantId>` (private, RLS: shop members) | the dashboard | an order is placed or changes | `{ orderId, op: 'insert' \| 'update', status, paymentStatus }` |

Payloads are only a nudge: the hook refetches through the normal queries, so RLS still decides what is read.
