import { dbFunctions, OrderPayload, OrderReceipt, Payment, Quote, QuotePayload } from '@smartapp/core';
import type { DbFunctionInput, DbFunctionOutput } from '@smartapp/core';

import type { ApiClient } from '../client';
import type { Json } from '../database.types';
import { ApiError, throwIfError, toApiError } from '../errors';
import { fromJson, parsed } from '../rows';

// Slice 3: checkout and receipt (docs/api-surface.md). The database prices, numbers and checks everything; these
// functions only send the customer's choices and check what comes back with the core schemas.

export const PAYMENT_PROOFS_BUCKET = 'payment-proofs';

/** What place_order returns. */
export type PlacedOrder = DbFunctionOutput<'place_order'>;
/** What the checkout form gives usePlaceOrder: the payload without its clientKey (the hook keeps that). */
export type OrderInput = Omit<OrderPayload, 'clientKey'>;
export type PaymentProofInput = DbFunctionInput<'submit_payment_proof'>;

type JsonObject = { [key: string]: Json | undefined };

/** The customer's choices, field by field, so nothing else (a price, say) reaches the database. */
function choicesToJson(payload: QuotePayload): JsonObject {
  const { delivery } = payload;
  return {
    fulfillment: payload.fulfillment,
    lines: payload.lines.map((line) => ({
      itemId: line.itemId,
      variantId: line.variantId,
      optionIds: line.optionIds,
      qty: line.qty,
      note: line.note,
    })),
    paymentMethod: payload.paymentMethod,
    pickupAt: payload.pickupAt,
    delivery:
      delivery === null
        ? null
        : { addressLine: delivery.addressLine, landmark: delivery.landmark, deliveryZoneId: delivery.deliveryZoneId },
    useReward: payload.useReward,
  };
}

/** The quote_order payload: the choices only. */
export function quotePayloadToJson(payload: QuotePayload): Json {
  return choicesToJson(payload);
}

/** The place_order payload: the choices plus clientKey, customer, notes and the privacy consent. */
export function orderPayloadToJson(payload: OrderPayload): Json {
  return {
    ...choicesToJson(payload),
    clientKey: payload.clientKey,
    customer: { name: payload.customer.name, phone: payload.customer.phone, email: payload.customer.email },
    notes: payload.notes,
    privacyConsent: payload.privacyConsent,
  };
}

/** Prices the cart from the database. Line problems come back in `problems`; shop-level problems are errors. */
export async function quoteOrder(client: ApiClient, slug: string, payload: QuotePayload): Promise<Quote> {
  const input = parsed(QuotePayload.safeParse(payload));
  const { data, error } = await client.rpc('quote_order', { p_slug: slug, p_payload: quotePayloadToJson(input) });
  throwIfError(error);
  return fromJson(Quote, data);
}

/** Places the order. The same clientKey in the same shop returns the first order, so a retry is always safe. */
export async function placeOrder(client: ApiClient, slug: string, payload: OrderPayload): Promise<PlacedOrder> {
  const input = parsed(OrderPayload.safeParse(payload));
  const { data, error } = await client.rpc('place_order', { p_slug: slug, p_payload: orderPayloadToJson(input) });
  throwIfError(error);
  return fromJson(dbFunctions.place_order.output, data);
}

/**
 * Places orders for one checkout with one clientKey: a retry after a failure (a dropped connection, say) sends the
 * same key and gets the same order; only a success starts a new key for the next checkout.
 */
export function createOrderPlacer(
  place: (slug: string, payload: OrderPayload) => Promise<PlacedOrder>,
  newKey: () => string = () => crypto.randomUUID(),
): (slug: string, input: OrderInput) => Promise<PlacedOrder> {
  let clientKey = newKey();
  return async (slug, input) => {
    const placed = await place(slug, { ...input, clientKey });
    clientKey = newKey();
    return placed;
  };
}

/** The receipt; `null` for a link that is not an order (the page shows not found). */
export async function getOrder(client: ApiClient, token: string): Promise<OrderReceipt | null> {
  const { data, error } = await client.rpc('get_order', { p_token: token });
  if (error) {
    const failure = toApiError(error);
    if (failure.code === 'not_found') return null;
    throw failure;
  }
  return fromJson(OrderReceipt, data);
}

/**
 * Uploads an already compressed proof photo to `<tenantId>/<token>/<uuid>.webp`. The storage policy lets only the
 * receipt link's holder upload, and only while the order waits for payment (`order_not_payable` otherwise).
 */
export async function uploadPaymentProof(
  client: ApiClient,
  order: { tenantId: string; token: string },
  blob: Blob,
): Promise<{ path: string }> {
  const path = `${order.tenantId}/${order.token}/${crypto.randomUUID()}.webp`;
  const { error } = await client.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(path, blob, { upsert: false, contentType: 'image/webp' });
  if (error) {
    if (/row-level security/i.test(error.message)) throw new ApiError('order_not_payable');
    throw toApiError(error);
  }
  return { path };
}

/** Sends the proof and reference number; the order's payment becomes pending until the owner checks it. */
export async function submitPaymentProof(client: ApiClient, input: PaymentProofInput): Promise<Payment> {
  const proof = parsed(dbFunctions.submit_payment_proof.input.safeParse(input));
  const { data, error } = await client.rpc('submit_payment_proof', {
    p_token: proof.token,
    p_method: proof.method,
    p_reference_no: proof.referenceNo,
    p_proof_path: proof.proofPath,
  });
  throwIfError(error);
  return fromJson(Payment, data);
}
