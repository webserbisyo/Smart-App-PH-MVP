// Order rules (paper 6.4, 6.9): the next step, the board column, the timeline, cancel and late. One copy for every
// screen that shows an order; P5.4's SQL (`advance_order`, `record_payment`) follows the same table of cases.
// Steps only move forward: there is no Undo.
import type { CashMethod, OrderStatus } from './schemas/enums';
import type { OrderEvent } from './schemas/order-event';
import type { Order } from './schemas/order';
import type { OrderLine } from './schemas/order-line';
import type { Payment } from './schemas/payment';
import type { ShopSettings } from './schemas/shop';
import { minutesSince } from './time';
import { WORDS } from './words';

/** What the rules need to know about an order. */
export type RuleOrder = Pick<Order, 'status' | 'paymentStatus' | 'paymentMethod' | 'fulfillment' | 'placedAt' | 'pickupAt'>;

/** What the rules need to know about the shop. */
export type RuleSettings = Pick<ShopSettings, 'payLaterPickup'>;

export const ORDER_ACTIONS = ['verify_payment', 'mark_paid', 'start', 'mark_ready', 'out_for_delivery', 'complete'] as const;
export type OrderAction = (typeof ORDER_ACTIONS)[number];

/** The statuses `advance_order` moves an order to. */
export type AdvanceStatus = Extract<OrderStatus, 'preparing' | 'ready' | 'out_for_delivery' | 'completed'>;

/** The status an action moves the order to (payment actions keep the status). */
export const ACTION_TO_STATUS: Readonly<Partial<Record<OrderAction, AdvanceStatus>>> = {
  start: 'preparing',
  mark_ready: 'ready',
  out_for_delivery: 'out_for_delivery',
  complete: 'completed',
};

export const OPEN_STATUSES = ['placed', 'preparing', 'ready', 'out_for_delivery'] as const satisfies readonly OrderStatus[];

export function isOpen(order: Pick<RuleOrder, 'status'>): boolean {
  return OPEN_STATUSES.some((status) => status === order.status);
}

/**
 * May the order start while unpaid? Cash at a walk-in counter, cash at pickup when the shop allows paying later, and
 * cash on delivery. Transfers (GCash, Maya, bank) start only once paid.
 */
export function canStartUnpaid(order: RuleOrder, settings: RuleSettings): boolean {
  if (order.paymentMethod === 'cod') return true;
  if (order.paymentMethod !== 'cash') return false;
  return order.fulfillment === 'walk_in' || (order.fulfillment === 'pickup' && settings.payLaterPickup);
}

/** The payment step an order still needs, or none. */
function paymentStep(order: RuleOrder): OrderAction | null {
  if (order.paymentStatus === 'pending') return 'verify_payment';
  if (order.paymentStatus === 'unpaid') return 'mark_paid';
  return null;
}

/**
 * The steps the owner can take now, the main step first. The board shows the first as the one big button and the
 * rest under "More". Completing needs the order paid, so an unpaid order shows its payment step before Complete.
 */
export function nextActions(order: RuleOrder, settings: RuleSettings): OrderAction[] {
  const pay = paymentStep(order);
  const withPay = (main: OrderAction): OrderAction[] => (pay ? [main, pay] : [main]);
  const finish = (): OrderAction[] => (pay ? [pay] : ['complete']);

  switch (order.status) {
    case 'placed': {
      if (pay === 'verify_payment') return ['verify_payment'];
      if (pay === null) return ['start'];
      if (!canStartUnpaid(order, settings)) return ['mark_paid'];
      // Walk-in customers pay at the counter when they order; pickup and delivery pay at hand-over.
      return order.fulfillment === 'walk_in' ? ['mark_paid', 'start'] : ['start', 'mark_paid'];
    }
    case 'preparing':
      return withPay('mark_ready');
    case 'ready':
      return order.fulfillment === 'delivery' ? withPay('out_for_delivery') : finish();
    case 'out_for_delivery':
      return finish();
    case 'completed':
    case 'cancelled':
    case 'expired':
      return [];
  }
}

/** Paid in full (the order may complete). */
export function isPaid(order: Pick<RuleOrder, 'paymentStatus'>): boolean {
  return order.paymentStatus === 'paid';
}

/** What Mark paid records (decision P5-28): cash on delivery for delivery orders, cash for the rest. */
export function recordMethod(order: Pick<RuleOrder, 'fulfillment'>): CashMethod {
  return order.fulfillment === 'delivery' ? 'cod' : 'cash';
}

/** Mark paid is offered while the order is open and nothing is paid or waiting to be checked. */
export function canRecordPayment(order: Pick<RuleOrder, 'status' | 'paymentStatus'>): boolean {
  return isOpen(order) && order.paymentStatus === 'unpaid';
}

type RulePayment = Pick<Payment, 'status' | 'createdAt' | 'rejectReason'>;

function latest<T extends RulePayment>(payments: readonly T[]): T | null {
  return payments.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt)).at(-1) ?? null;
}

/** The proof the owner checks now: the latest payment, when it waits and the order can still be paid. */
export function paymentToReview<T extends RulePayment>(order: Pick<RuleOrder, 'status' | 'paymentStatus'>, payments: readonly T[]): T | null {
  const last = latest(payments);
  return isOpen(order) && order.paymentStatus === 'pending' && last?.status === 'pending' ? last : null;
}

/** Why the last proof was not accepted, while the order waits for a new one. */
export function rejectionReason(order: Pick<RuleOrder, 'paymentStatus'>, payments: readonly RulePayment[]): string | null {
  const last = latest(payments);
  return order.paymentStatus === 'unpaid' && last?.status === 'rejected' ? last.rejectReason : null;
}

/** A cancelled order that was paid: the refund is by hand. */
export function needsRefund(order: Pick<RuleOrder, 'status' | 'paymentStatus'>): boolean {
  return order.status === 'cancelled' && isPaid(order);
}

export const BOARD_COLUMNS = ['new', 'preparing', 'ready', 'out', 'done'] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

/** Where an order sits on the board; `null` = not on the board (cancelled or expired). */
export function boardColumn(order: Pick<RuleOrder, 'status'>): BoardColumn | null {
  switch (order.status) {
    case 'placed':
      return 'new';
    case 'preparing':
      return 'preparing';
    case 'ready':
      return 'ready';
    case 'out_for_delivery':
      return 'out';
    case 'completed':
      return 'done';
    case 'cancelled':
    case 'expired':
      return null;
  }
}

/** Cancel (with a reason) is allowed from every open status. */
export function canCancel(order: Pick<RuleOrder, 'status'>): boolean {
  return isOpen(order);
}

/** Minutes an order may wait before it reads as late. */
export const LATE_AFTER_MINUTES = 15;

/** Late: a pickup time that has passed, or a new or preparing order waiting over 15 minutes. */
export function isLate(order: RuleOrder, now: Date): boolean {
  if (order.status !== 'placed' && order.status !== 'preparing' && order.status !== 'ready') return false;
  if (order.pickupAt) return now.getTime() > new Date(order.pickupAt).getTime();
  if (order.status === 'ready') return false;
  return minutesSince(order.placedAt, now) > LATE_AFTER_MINUTES;
}

export type TimelineState = 'done' | 'current' | 'upcoming';

export interface TimelineStep {
  status: OrderStatus;
  state: TimelineState;
  /** When the order reached this step, from its events; `null` when not reached or unknown. */
  at: string | null;
}

/** The happy path for a fulfillment. */
export function flowFor(fulfillment: RuleOrder['fulfillment']): OrderStatus[] {
  return fulfillment === 'delivery'
    ? ['placed', 'preparing', 'ready', 'out_for_delivery', 'completed']
    : ['placed', 'preparing', 'ready', 'completed'];
}

/**
 * The steps the receipt and the order detail show. Cancelled and expired orders show the steps they reached, then
 * the end step as the current one.
 */
export function timelineSteps(
  order: Pick<RuleOrder, 'status' | 'fulfillment' | 'placedAt'>,
  events: readonly Pick<OrderEvent, 'toStatus' | 'createdAt'>[],
): TimelineStep[] {
  const reachedAt = new Map<OrderStatus, string>([['placed', order.placedAt]]);
  for (const event of events) {
    if (event.toStatus !== null && event.toStatus !== 'placed') reachedAt.set(event.toStatus, event.createdAt);
  }
  const flow = flowFor(order.fulfillment);
  const ended = order.status === 'cancelled' || order.status === 'expired';

  if (ended) {
    const reached = flow.filter((status) => status !== 'completed' && reachedAt.has(status));
    return [
      ...reached.map((status): TimelineStep => ({ status, state: 'done', at: reachedAt.get(status) ?? null })),
      { status: order.status, state: 'current', at: reachedAt.get(order.status) ?? null },
    ];
  }

  const currentIndex = flow.indexOf(order.status);
  return flow.map((status, index): TimelineStep => {
    const state: TimelineState =
      index < currentIndex || (status === 'completed' && index === currentIndex)
        ? 'done'
        : index === currentIndex
          ? 'current'
          : 'upcoming';
    return { status, state, at: state === 'upcoming' ? null : (reachedAt.get(status) ?? null) };
  });
}

/** Two lines for a card: "2x Iced Latte, Large", "1x Ensaymada", then how many more. */
export function itemsSummary(
  lines: readonly Pick<OrderLine, 'qty' | 'itemName' | 'variantName'>[],
  max = 2,
): { lines: string[]; more: number } {
  return {
    lines: lines
      .slice(0, max)
      .map((line) =>
        WORDS.order.lineSummary(
          line.qty,
          line.itemName,
          line.variantName === WORDS.order.defaultVariant ? null : line.variantName,
        ),
      ),
    more: Math.max(0, lines.length - max),
  };
}
