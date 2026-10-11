// Orders: what the apps send (`build_order`'s payload) and what the RPCs and table reads return.
import * as z from 'zod';

import { PhoneSchema } from '../profile';

import { CartLineInputSchema } from './cart';
import {
  CancelReasonCodeSchema,
  DiscountKindSchema,
  FulfillmentTypeSchema,
  OrderChannelSchema,
  OrderEventKindSchema,
  OrderEventViaSchema,
  OrderStatusSchema,
  PaymentKindSchema,
  PaymentMethodSchema,
  PaymentReviewStatusSchema,
  PaymentStatusSchema,
} from './lists';
import { AmountSchema, DateOnlySchema, RowIdSchema, TimestampSchema } from './primitives';
import { manilaDate } from './time';

export const ORDER_NOTES_MAX = 300;
export const LANDMARK_MAX = 120;
export const ADDRESS_MAX = 200;

/** POS discounts (`create_pos_order` / `quote_pos_order` → `discounts[]`). */
export const PosDiscountInputSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.enum(['senior', 'pwd']),
    holder_name: z.string().trim().min(2).max(80),
    id_number: z.string().trim().min(4).max(30),
    share_amount: z.number().int().min(1),
  }),
  z.object({
    kind: z.literal('manual'),
    amount: z.number().int().min(1).optional(),
    percent: z.number().gt(0).max(100).optional(),
    reason: z.string().trim().min(3).max(200),
    label: z.string().trim().max(60).optional(),
    /** The owner's PIN when the cashier lacks `discount.manual`. Never in a quote. */
    pin: z.string().regex(/^\d{4,6}$/).optional(),
  }),
]);
export type PosDiscountInput = z.infer<typeof PosDiscountInputSchema>;

/** Mirrors the payload `private.build_order` reads. Leave out what doesn't apply. */
export const OrderPayloadSchema = z.object({
  fulfillment: FulfillmentTypeSchema,
  lines: z.array(CartLineInputSchema).min(1).max(50),
  customer: z
    .object({
      name: z.string().trim().max(80).optional(),
      phone: PhoneSchema.optional(),
      email: z.string().trim().max(120).optional(),
    })
    .optional(),
  table_token: z.string().optional(),
  scheduled_for: z.string().optional(),
  address: z
    .object({
      line: z.string().trim().max(ADDRESS_MAX).optional(),
      landmark: z.string().trim().max(LANDMARK_MAX).optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  delivery_zone_id: RowIdSchema.optional(),
  payment_method: PaymentMethodSchema.optional(),
  notes: z.string().trim().max(ORDER_NOTES_MAX).optional(),
  consents: z.object({ privacy: z.boolean(), push: z.boolean().optional(), email: z.boolean().optional() }).optional(),
  voucher_code: z.string().trim().toUpperCase().max(20).optional(),
  redeem_reward: z.boolean().optional(),
  installed_app: z.boolean().optional(),
  /** A uuid made once per checkout attempt and kept until it succeeds: a retry returns the first order. */
  client_key: z.uuid().optional(),
  discounts: z.array(PosDiscountInputSchema).max(10).optional(),
});
export type OrderPayload = z.infer<typeof OrderPayloadSchema>;
export type OrderPayloadInput = z.input<typeof OrderPayloadSchema>;

// --- RPC results --------------------------------------------------------------------------------

/** `place_order()` */
export const PlaceOrderResultSchema = z.object({
  token: z.string(),
  order_no: z.number().int(),
  business_date: DateOnlySchema,
  total: AmountSchema,
  payment_status: PaymentStatusSchema,
  expires_at: TimestampSchema.nullable(),
});
export type PlaceOrderResult = z.infer<typeof PlaceOrderResultSchema>;

export const PIN_FAILURE_CODES = ['wrong_pin', 'pin_locked', 'pin_not_set'] as const;
export const PinFailureSchema = z.object({ ok: z.literal(false), code: z.enum(PIN_FAILURE_CODES) });
export type PinFailure = z.infer<typeof PinFailureSchema>;

/** `create_pos_order()`: the order, or a PIN failure (returned, not raised, so the try counter is kept). */
export const PosOrderResultSchema = z.union([
  z.object({ ok: z.literal(true), id: RowIdSchema, order_no: z.number().int(), total: AmountSchema }),
  PinFailureSchema,
]);
export type PosOrderResult = z.infer<typeof PosOrderResultSchema>;

/** `void_order()` */
export const VoidResultSchema = z.union([z.object({ ok: z.literal(true) }), PinFailureSchema]);
export type VoidResult = z.infer<typeof VoidResultSchema>;

export const AppliedDiscountSchema = z.object({ kind: DiscountKindSchema, label: z.string().nullable(), amount: AmountSchema });
export type AppliedDiscount = z.infer<typeof AppliedDiscountSchema>;

/** `quote_order()` / `quote_pos_order()` */
export const QuoteSchema = z.object({
  subtotal: AmountSchema,
  discount_total: AmountSchema,
  delivery_fee: AmountSchema,
  total: AmountSchema,
  discounts: z.array(AppliedDiscountSchema),
});
export type Quote = z.infer<typeof QuoteSchema>;

/** `record_payment()` */
export const RecordPaymentResultSchema = z.object({ change_due: AmountSchema.nullable(), paid: z.literal(true) });
export type RecordPaymentResult = z.infer<typeof RecordPaymentResultSchema>;

/** `get_order_by_token()`: the customer's view. No ids, phone, address, proof paths or staff names. */
export const PublicOrderSchema = z.object({
  order_no: z.number().int(),
  business_date: DateOnlySchema,
  channel: OrderChannelSchema,
  fulfillment: FulfillmentTypeSchema,
  status: OrderStatusSchema,
  payment_status: PaymentStatusSchema,
  payment_method: PaymentMethodSchema.nullable(),
  customer_name: z.string().nullable(),
  table_label: z.string().nullable(),
  zone_name: z.string().nullable(),
  scheduled_for: TimestampSchema.nullable(),
  is_preorder: z.boolean(),
  subtotal: AmountSchema,
  discount_total: AmountSchema,
  delivery_fee: AmountSchema,
  total: AmountSchema,
  courier: z.string().nullable(),
  tracking_url: z.string().nullable(),
  expires_at: TimestampSchema.nullable(),
  placed_at: TimestampSchema,
  paid_at: TimestampSchema.nullable(),
  ready_at: TimestampSchema.nullable(),
  completed_at: TimestampSchema.nullable(),
  cancel_reason: z.string().nullable(),
  cancel_reason_code: CancelReasonCodeSchema.nullable().optional(),
  items: z.array(
    z.object({
      item_name: z.string(),
      variant_name: z.string(),
      qty: z.number().int(),
      unit_price: AmountSchema,
      options_total: AmountSchema,
      line_total: AmountSchema,
      options: z.array(z.object({ group_name: z.string(), option_name: z.string() })),
    }),
  ),
  discounts: z.array(AppliedDiscountSchema),
  payments: z.array(
    z.object({
      kind: PaymentKindSchema,
      method: PaymentMethodSchema,
      amount: AmountSchema,
      status: PaymentReviewStatusSchema,
      reject_reason: z.string().nullable(),
    }),
  ),
  events: z.array(z.object({ kind: OrderEventKindSchema, to_status: z.string().nullable(), created_at: TimestampSchema })),
  shop: z.object({
    slug: z.string(),
    name: z.string(),
    messenger_page: z.string().nullable(),
    messenger_mode: z.string(),
  }),
});
export type PublicOrder = z.infer<typeof PublicOrderSchema>;

/** `get_orders_by_tokens()`: "My orders" on this device. */
export const OrderByTokenSummarySchema = z.object({
  token: z.string(),
  order_no: z.number().int(),
  shop_slug: z.string(),
  shop_name: z.string(),
  status: OrderStatusSchema,
  payment_status: PaymentStatusSchema,
  total: AmountSchema,
  placed_at: TimestampSchema,
});
export type OrderByTokenSummary = z.infer<typeof OrderByTokenSummarySchema>;

// --- staff reads (tables, under RLS) ------------------------------------------------------------

export const OrderItemOptionRowSchema = z.object({ group_name: z.string(), option_name: z.string(), price_delta: AmountSchema });

export const OrderItemRowSchema = z.object({
  id: RowIdSchema,
  item_id: RowIdSchema.nullable(),
  variant_id: RowIdSchema.nullable(),
  item_name: z.string(),
  variant_name: z.string(),
  qty: z.number().int(),
  unit_price: AmountSchema,
  options_total: AmountSchema,
  line_total: AmountSchema,
  notes: z.string().nullable(),
  sort: z.number().int(),
  order_item_options: z.array(OrderItemOptionRowSchema),
});
export type OrderItemRow = z.infer<typeof OrderItemRowSchema>;

export const PaymentRowSchema = z.object({
  id: RowIdSchema,
  kind: PaymentKindSchema,
  method: PaymentMethodSchema,
  amount: AmountSchema,
  status: PaymentReviewStatusSchema,
  reference_no: z.string().nullable(),
  proof_path: z.string().nullable(),
  proof_duplicate: z.boolean(),
  tendered: AmountSchema.nullable(),
  change_due: AmountSchema.nullable(),
  received_by: RowIdSchema.nullable(),
  reviewed_by: RowIdSchema.nullable(),
  reviewed_at: TimestampSchema.nullable(),
  reject_reason: z.string().nullable(),
  created_at: TimestampSchema,
});
export type PaymentRow = z.infer<typeof PaymentRowSchema>;

/** One order as the board, history and POS read it (orders + items + payments). */
export const StaffOrderSchema = z.object({
  id: RowIdSchema,
  order_no: z.number().int(),
  business_date: DateOnlySchema,
  token: z.string(),
  channel: OrderChannelSchema,
  fulfillment: FulfillmentTypeSchema,
  status: OrderStatusSchema,
  payment_status: PaymentStatusSchema,
  payment_method: PaymentMethodSchema.nullable(),
  customer_id: RowIdSchema.nullable(),
  /** The customer's member date, when the reader may see customers (owners); `null`/missing otherwise. */
  customer: z.object({ member_since: TimestampSchema.nullable() }).nullable().optional(),
  customer_name: z.string().nullable(),
  customer_phone: z.string().nullable(),
  table_label: z.string().nullable(),
  zone_name: z.string().nullable(),
  address_line: z.string().nullable(),
  landmark: z.string().nullable(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  scheduled_for: TimestampSchema.nullable(),
  is_preorder: z.boolean(),
  notes: z.string().nullable(),
  subtotal: AmountSchema,
  discount_total: AmountSchema,
  delivery_fee: AmountSchema,
  total: AmountSchema,
  courier: z.string().nullable(),
  tracking_url: z.string().nullable(),
  expires_at: TimestampSchema.nullable(),
  placed_at: TimestampSchema,
  paid_at: TimestampSchema.nullable(),
  ready_at: TimestampSchema.nullable(),
  completed_at: TimestampSchema.nullable(),
  cancel_reason: z.string().nullable(),
  cancel_reason_code: CancelReasonCodeSchema.nullable().optional(),
  created_by: RowIdSchema.nullable(),
  order_items: z.array(OrderItemRowSchema),
  payments: z.array(PaymentRowSchema),
});
export type StaffOrder = z.infer<typeof StaffOrderSchema>;

export const OrderEventRowSchema = z.object({
  id: RowIdSchema,
  kind: OrderEventKindSchema,
  from_status: z.string().nullable(),
  to_status: z.string().nullable(),
  actor_id: RowIdSchema.nullable(),
  via: OrderEventViaSchema,
  meta: z.record(z.string(), z.unknown()),
  created_at: TimestampSchema,
});
export type OrderEventRow = z.infer<typeof OrderEventRowSchema>;

export const DiscountRowSchema = z.object({
  id: RowIdSchema,
  kind: DiscountKindSchema,
  amount: AmountSchema,
  label: z.string().nullable(),
  share_amount: AmountSchema.nullable(),
  approval_id: RowIdSchema.nullable(),
  created_by: RowIdSchema.nullable(),
  created_at: TimestampSchema,
});
export type DiscountRow = z.infer<typeof DiscountRowSchema>;

/** Order detail: the order plus its timeline and discounts, and the names of the people in them. */
export interface StaffOrderDetail {
  order: StaffOrder;
  events: OrderEventRow[];
  discounts: DiscountRow[];
  /** user id → display name (staff who acted on it). */
  people: Readonly<Record<string, string>>;
  /** Paid orders this customer has at the shop (for "3rd order here"). */
  customerOrderCount: number | null;
}

/** Remaining amount to pay (total minus confirmed payments). */
export function amountDue(order: Pick<StaffOrder, 'total' | 'payments'>): number {
  const paid = order.payments
    .filter((payment) => payment.kind === 'payment' && payment.status === 'confirmed')
    .reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, order.total - paid);
}

/** The payment waiting for review (an uploaded proof), if any. */
export function pendingProof(order: Pick<StaffOrder, 'payments'>): PaymentRow | null {
  return order.payments.find((payment) => payment.kind === 'payment' && payment.status === 'pending') ?? null;
}

export const UpcomingScheduledOrderRowSchema = z.object({
  order_id: RowIdSchema,
  order_no: z.number().int(),
  scheduled_for: TimestampSchema,
  customer_name: z.string(),
  order_type: z.string(),
  first_item: z.string().nullable(),
  item_count: z.number().int(),
  total: AmountSchema,
  paid: z.boolean(),
  /** Confirmed so far (a deposit shows as part of the total). Missing before migration 20261011200000. */
  paid_amount: AmountSchema.optional(),
});
export type UpcomingScheduledOrderRow = z.infer<typeof UpcomingScheduledOrderRowSchema>;

export const UpcomingScheduledSchema = z.object({
  tomorrow: z.object({
    count: z.number().int(),
    total: AmountSchema,
  }),
  week: z.object({
    count: z.number().int(),
    total: AmountSchema,
  }),
  rows: z.array(UpcomingScheduledOrderRowSchema),
  make_tomorrow: z.array(
    z.object({
      item_name: z.string(),
      qty: z.number().int(),
    }),
  ),
});
export type UpcomingScheduled = z.infer<typeof UpcomingScheduledSchema>;

export const CloseStaleOrdersResultSchema = z.object({
  completed: z.number().int(),
  cancelled: z.number().int(),
});
export type CloseStaleOrdersResult = z.infer<typeof CloseStaleOrdersResultSchema>;

export interface OpenOrdersSplit<T> {
  late: T[];
  stale: T[];
  active: T[];
  /** Advance orders for a later day: not late, not stale, shown under "Coming up". */
  scheduled: T[];
}

/** Minutes before an order counts as late. */
export const LATE_AFTER_MINUTES = 20;

/**
 * Splits open orders (Manila calendar):
 * - scheduled: an advance order for a day after today
 * - stale: placed before today and not scheduled for today or later (left open by mistake)
 * - late: today's order waiting 20+ minutes (an advance order due today counts from its due time)
 * - active: the rest of today's orders
 */
export function splitOpenOrders<T extends { placed_at: string | Date; scheduled_for?: string | null | undefined }>(
  orders: readonly T[],
  now: Date,
): OpenOrdersSplit<T> {
  const today = manilaDate(now);
  const nowMs = now.getTime();
  const lateMs = LATE_AFTER_MINUTES * 60 * 1000;

  const late: T[] = [];
  const stale: T[] = [];
  const active: T[] = [];
  const scheduled: T[] = [];

  for (const order of orders) {
    const placed = typeof order.placed_at === 'string' ? new Date(order.placed_at) : order.placed_at;
    const dueDate = order.scheduled_for ? manilaDate(new Date(order.scheduled_for)) : null;
    if (dueDate !== null && dueDate > today) {
      scheduled.push(order);
    } else if (dueDate === today && order.scheduled_for) {
      // Due today: never late before its due time; late 20 min after it.
      if (nowMs - new Date(order.scheduled_for).getTime() >= lateMs) late.push(order);
      else active.push(order);
    } else if (manilaDate(placed) < today) {
      stale.push(order);
    } else if (nowMs - placed.getTime() >= lateMs) {
      late.push(order);
    } else {
      active.push(order);
    }
  }

  return { late, stale, active, scheduled };
}



// --- Schedule (advance orders) -----------------------------------------------------------------------------

/** The Schedule page asks for at most this many days at once (`get_schedule` refuses more). */
export const SCHEDULE_MAX_DAYS = 62;

export const ScheduleDayTotalSchema = z.object({
  date: DateOnlySchema,
  count: z.number().int(),
  total: AmountSchema,
  /** Still to collect on that day's open orders. */
  unpaid: AmountSchema,
});
export type ScheduleDayTotal = z.infer<typeof ScheduleDayTotalSchema>;

export const ScheduleRowSchema = z.object({
  order_id: RowIdSchema,
  order_no: z.number().int(),
  scheduled_for: TimestampSchema,
  customer_name: z.string().nullable(),
  fulfillment: FulfillmentTypeSchema,
  status: OrderStatusSchema,
  payment_status: PaymentStatusSchema,
  total: AmountSchema,
  paid_amount: AmountSchema,
  items: z.array(z.object({ name: z.string(), qty: z.number().int() })),
});
export type ScheduleRow = z.infer<typeof ScheduleRowSchema>;

export const ScheduleSchema = z.object({
  days: z.array(ScheduleDayTotalSchema),
  rows: z.array(ScheduleRowSchema),
  to_make: z.array(z.object({ date: DateOnlySchema, item_name: z.string(), qty: z.number().int() })),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

/** When the clock starts for an open order: its due time if it is an advance order due today, else when it was placed. */
export function orderClockStart(order: { placed_at: string; scheduled_for?: string | null | undefined }, now: Date): string {
  return order.scheduled_for && manilaDate(new Date(order.scheduled_for)) === manilaDate(now) ? order.scheduled_for : order.placed_at;
}

/**
 * In progress order: late first (longest waiting first), then advance orders due today (soonest due first), then
 * the rest newest first.
 */
export function sortInProgress<T extends { placed_at: string; scheduled_for?: string | null | undefined }>(
  orders: readonly T[],
  late: ReadonlySet<T>,
  now: Date,
): T[] {
  const today = manilaDate(now);
  const due = (order: T) => (order.scheduled_for && manilaDate(new Date(order.scheduled_for)) === today ? new Date(order.scheduled_for).getTime() : null);
  const rank = (order: T) => (late.has(order) ? 0 : due(order) !== null ? 1 : 2);
  return [...orders].sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank !== 0) return byRank;
    if (rank(a) === 0) return new Date(orderClockStart(a, now)).getTime() - new Date(orderClockStart(b, now)).getTime();
    if (rank(a) === 1) return (due(a) ?? 0) - (due(b) ?? 0);
    return new Date(b.placed_at).getTime() - new Date(a.placed_at).getTime();
  });
}
