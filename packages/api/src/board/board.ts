import { dbFunctions, manilaDate, manilaInstant, Order, Payment } from '@smartapp/core';
import type { BoardOrder, DbFunctionInput, OrderReceipt } from '@smartapp/core';

import type { ApiClient } from '../client';
import { ApiError, throwIfError } from '../errors';
import { PAYMENT_PROOFS_BUCKET } from '../orders/orders';
import { parsed } from '../rows';

import { boardOrderFromRow, orderDetailFromRow } from './mappers';

// Slice 4: the orders board (docs/api-surface.md). Owners read orders through RLS; every change goes through the
// P5.4 database functions, which check the step, lock the order and write the timeline and the audit log.

/** `open`: every order still in progress, plus the ones completed today. `day`: every order of one Manila date. */
export type OrderScope = { kind: 'open' } | { kind: 'day'; date: string };

export type ReviewPaymentInput = DbFunctionInput<'review_payment'>;
export type RecordPaymentInput = DbFunctionInput<'record_payment'>;
export type AdvanceOrderInput = DbFunctionInput<'advance_order'>;
export type CancelOrderInput = DbFunctionInput<'cancel_order'>;

/** A signed proof link lasts this long (paper 6.4). */
export const PROOF_URL_SECONDS = 300;

const OPEN_STATUSES = 'placed,preparing,ready,out_for_delivery';

interface Parser<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { message: string } };
}

function fromJson<T>(schema: Parser<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError('unknown', result.error.message);
  return result.data;
}

/** The board's orders, oldest first, each with its lines. */
export async function getOrders(client: ApiClient, tenantId: string, scope: OrderScope, now = new Date()): Promise<BoardOrder[]> {
  const query = client.from('orders').select('*, order_items (*)').eq('tenant_id', tenantId);
  const filtered =
    scope.kind === 'open'
      ? query.or(`status.in.(${OPEN_STATUSES}),completed_at.gte.${new Date(manilaInstant(manilaDate(now), '00:00')).toISOString()}`)
      : query.eq('business_date', scope.date);
  const { data, error } = await filtered.order('placed_at').order('order_no');
  throwIfError(error);
  return (data ?? []).map(boardOrderFromRow);
}

/** One order with its lines, timeline and payments (owners also get the normalised reference); `null` if not found. */
export async function getOrderDetail(client: ApiClient, orderId: string): Promise<OrderReceipt | null> {
  const { data, error } = await client
    .from('orders')
    .select('*, order_items (*), order_events (*), payments (*)')
    .eq('id', orderId)
    .maybeSingle();
  throwIfError(error);
  return data === null ? null : orderDetailFromRow(data);
}

/** A 5-minute link to a payment proof photo. */
export async function getProofUrl(client: ApiClient, path: string): Promise<string> {
  const { data, error } = await client.storage.from(PAYMENT_PROOFS_BUCKET).createSignedUrl(path, PROOF_URL_SECONDS);
  throwIfError(error);
  if (data === null) throw new ApiError('unknown');
  return data.signedUrl;
}

/** Approves a proof (the order is paid) or rejects it with a reason (the customer can send another). */
export async function reviewPayment(client: ApiClient, input: ReviewPaymentInput): Promise<Payment> {
  const review = parsed(dbFunctions.review_payment.input.safeParse(input));
  const { data, error } = await client.rpc('review_payment', {
    p_payment_id: review.paymentId,
    p_approve: review.approve,
    ...(review.approve || review.rejectReason === null ? {} : { p_reject_reason: review.rejectReason }),
  });
  throwIfError(error);
  return fromJson(Payment, data);
}

/** Records cash (walk-in, pickup) or cash on delivery as received. */
export async function recordPayment(client: ApiClient, input: RecordPaymentInput): Promise<Payment> {
  const payment = parsed(dbFunctions.record_payment.input.safeParse(input));
  const { data, error } = await client.rpc('record_payment', { p_order_id: payment.orderId, p_method: payment.method });
  throwIfError(error);
  return fromJson(Payment, data);
}

/** Moves the order one step forward. */
export async function advanceOrder(client: ApiClient, input: AdvanceOrderInput): Promise<Order> {
  const step = parsed(dbFunctions.advance_order.input.safeParse(input));
  const { data, error } = await client.rpc('advance_order', {
    p_order_id: step.orderId,
    p_to_status: step.toStatus,
    ...(step.trackingUrl === null ? {} : { p_tracking_url: step.trackingUrl }),
  });
  throwIfError(error);
  return fromJson(Order, data);
}

/** Cancels an open order with a reason; tracked stock comes back. */
export async function cancelOrder(client: ApiClient, input: CancelOrderInput): Promise<Order> {
  const cancel = parsed(dbFunctions.cancel_order.input.safeParse(input));
  const { data, error } = await client.rpc('cancel_order', { p_order_id: cancel.orderId, p_reason: cancel.reason });
  throwIfError(error);
  return fromJson(Order, data);
}

