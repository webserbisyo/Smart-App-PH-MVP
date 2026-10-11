// What an order's status is called, which colour it gets, where it sits on the board and what the next button is.
// No preset checks: words come from vocab (Ready / Packed) and from the fulfillment (Out for delivery / Shipped).
import type { Permission } from '../permissions';
import { DEFAULT_ORDER_AGE_THRESHOLDS, STATUS_TONE, orderAgeLevel } from '../status/tone';
import type { OrderAgeLevel, OrderAgeThresholds, Tone } from '../status/tone';
import type { Vocab } from '../vocab';

import { ORDER_END_STATUSES, ORDER_TRANSITIONS } from './lists';
import type { FulfillmentType, OrderStatus, PaymentMethod, PaymentStatus } from './lists';
import { formatDayLabel, manilaDate } from './time';

/** One colour per meaning (tokens in packages/ui; the table is `STATUS_TONE` in status/tone.ts). */
export type StatusTone = Tone;

/** Delivery and shipping go out; everything else is collected or served. */
export function goesOut(fulfillment: FulfillmentType): boolean {
  return fulfillment === 'delivery' || fulfillment === 'shipping';
}

/** The i18n key of an order status, in this business's words. */
export function orderStatusLabelKey(status: OrderStatus, fulfillment: FulfillmentType, vocab: Pick<Vocab, 'inProgress' | 'ready'>): string {
  switch (status) {
    case 'placed':
      return 'order.status.placed';
    case 'in_prep':
      return vocab.inProgress;
    case 'ready':
      return vocab.ready;
    case 'out':
      return fulfillment === 'shipping' ? 'order.status.shipped' : 'order.status.outForDelivery';
    case 'completed':
      return goesOut(fulfillment) ? 'order.status.delivered' : 'order.status.completed';
    case 'cancelled':
      return 'order.status.cancelled';
    case 'voided':
      return 'order.status.voided';
    case 'expired':
      return 'order.status.expired';
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

export function orderStatusTone(status: OrderStatus): StatusTone {
  return STATUS_TONE.order[status].tone;
}

/** "Paid", "To verify", "Unpaid", "Refunded"; COD unpaid reads "Cash on delivery". */
export function paymentLabelKey(status: PaymentStatus, method: PaymentMethod | null): string {
  if (status === 'unpaid' && method === 'cod') return 'payment.status.cod';
  return `payment.status.${status}`;
}

export function paymentTone(status: PaymentStatus): StatusTone {
  return STATUS_TONE.payment[status].tone;
}

export function isEndStatus(status: OrderStatus): boolean {
  return ORDER_END_STATUSES.some((end) => end === status);
}

/**
 * The nav's count badges from the live board. Orders: new orders and payments to verify (they need someone).
 * Kitchen / Packing: tickets not ready yet (new or being prepared).
 */
export function waitingCounts(orders: readonly Pick<ActionableOrder, 'status' | 'payment_status'>[]): { orders: number; prep: number } {
  let needsYou = 0;
  let toPrep = 0;
  for (const order of orders) {
    if (isEndStatus(order.status)) continue;
    if (order.status === 'placed' || order.payment_status === 'pending') needsYou += 1;
    if (order.status === 'placed' || order.status === 'in_prep') toPrep += 1;
  }
  return { orders: needsYou, prep: toPrep };
}

// --- next step ----------------------------------------------------------------------------------

/** The shop rules that decide whether an unpaid order may start (from `tenant_settings`). */
export interface StartRules {
  dine_in_pay_later: boolean;
  pickup_pay_at_counter: boolean;
}

export interface ActionableOrder {
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  fulfillment: FulfillmentType;
}

export type OrderAction =
  /** Move along the flow (Start, Ready/Packed, Out/Ship, Complete). */
  | { kind: 'advance'; to: OrderStatus; labelKey: string }
  /** Take payment first (opens Charge). */
  | { kind: 'markPaid' }
  /** Look at the uploaded screenshot. */
  | { kind: 'review' }
  | { kind: 'cancel' }
  /** `needsPin`: the person lacks `orders.void`, so the owner's PIN approves it. */
  | { kind: 'void'; needsPin: boolean };

export interface OrderActions {
  /** The one next-step button (brand colour), or none. */
  primary: OrderAction | null;
  /** Overflow-menu actions. */
  more: OrderAction[];
}

/** May the order go from `placed` to `in_prep` while unpaid? Same rule as `advance_order`. */
export function canStartUnpaid(order: ActionableOrder, rules: StartRules): boolean {
  return (
    order.payment_method === 'cod' ||
    (order.fulfillment === 'dine_in' && rules.dine_in_pay_later) ||
    (order.fulfillment === 'pickup' && order.payment_method === 'cash' && rules.pickup_pay_at_counter)
  );
}

function advanceLabel(to: OrderStatus, fulfillment: FulfillmentType, vocab: Pick<Vocab, 'bump'>): string {
  if (to === 'in_prep') return 'order.action.start';
  if (to === 'ready') return vocab.bump;
  if (to === 'out') return fulfillment === 'shipping' ? 'order.action.ship' : 'order.action.out';
  return 'order.action.complete';
}

function transitionAllowed(from: OrderStatus, to: OrderStatus, can: (permission: Permission) => boolean): boolean {
  return ORDER_TRANSITIONS.some(
    (row) => row.from === from && row.to === to && row.permission !== 'system' && can(row.permission),
  );
}

/**
 * The next-step button and the overflow actions, from `ORDER_TRANSITIONS` and the person's rights.
 * Mirrors the database rules so a button never leads to `invalid_transition`.
 */
export function nextActions(
  order: ActionableOrder,
  can: (permission: Permission) => boolean,
  rules: StartRules,
  vocab: Pick<Vocab, 'bump'>,
): OrderActions {
  const paid = order.payment_status === 'paid';
  const advance = (to: OrderStatus): OrderAction | null =>
    transitionAllowed(order.status, to, can) ? { kind: 'advance', to, labelKey: advanceLabel(to, order.fulfillment, vocab) } : null;
  const markPaid: OrderAction | null = can('orders.manage') ? { kind: 'markPaid' } : null;

  let primary: OrderAction | null;
  switch (order.status) {
    case 'placed':
      if (order.payment_status === 'pending') primary = can('orders.manage') ? { kind: 'review' } : null;
      else if (paid || canStartUnpaid(order, rules)) primary = advance('in_prep');
      else primary = markPaid;
      break;
    case 'in_prep':
      primary = advance('ready');
      break;
    case 'ready':
      if (goesOut(order.fulfillment)) primary = advance('out');
      else primary = paid ? advance('completed') : order.payment_status === 'pending' ? reviewIf(can) : markPaid;
      break;
    case 'out':
      primary = paid ? advance('completed') : order.payment_status === 'pending' ? reviewIf(can) : markPaid;
      break;
    default:
      primary = null;
  }

  const more: OrderAction[] = [];
  if (!isEndStatus(order.status) || order.status === 'completed') {
    if ((order.payment_status === 'unpaid' || order.payment_status === 'pending') && !isEndStatus(order.status) && transitionAllowed(order.status, 'cancelled', can)) {
      more.push({ kind: 'cancel' });
    }
    if (paid && transitionAllowed(order.status, 'voided', can)) {
      more.push({ kind: 'void', needsPin: !can('orders.void') });
    }
  }
  return { primary, more };
}

function reviewIf(can: (permission: Permission) => boolean): OrderAction | null {
  return can('orders.manage') ? { kind: 'review' } : null;
}

// --- board --------------------------------------------------------------------------------------

export const BOARD_COLUMNS = ['new', 'in_prep', 'ready', 'out', 'done'] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

/** Where an order sits on the board; `null` = not on the board (cancelled, voided, expired: see History). */
export function boardColumn(order: Pick<ActionableOrder, 'status'>): BoardColumn | null {
  switch (order.status) {
    case 'placed':
      return 'new';
    case 'in_prep':
      return 'in_prep';
    case 'ready':
      return 'ready';
    case 'out':
      return 'out';
    case 'completed':
      return 'done';
    case 'cancelled':
    case 'voided':
    case 'expired':
      return null;
    default: {
      const unreachable: never = order.status;
      return unreachable;
    }
  }
}

/** Groups orders into board columns, oldest first inside each. */
export function groupByColumn<T extends Pick<ActionableOrder, 'status'> & { placed_at: string }>(orders: readonly T[]): Record<BoardColumn, T[]> {
  const columns: Record<BoardColumn, T[]> = { new: [], in_prep: [], ready: [], out: [], done: [] };
  for (const order of orders) {
    const column = boardColumn(order);
    if (column) columns[column].push(order);
  }
  for (const column of BOARD_COLUMNS) columns[column].sort((a, b) => a.placed_at.localeCompare(b.placed_at));
  return columns;
}

/** How late an open order looks: ≥ 10 min warning, ≥ 20 min destructive, ≥ 60 min neutral (stale: "Check"). */
export function ageTone(minutes: number): StatusTone {
  return STATUS_TONE.orderAge[orderAgeLevel(minutes)].tone;
}

/**
 * How an open order's age reads. Minutes for the first hour ("12 min"), hours for the rest of the day
 * ("3 hr"), and the day itself for an order left open from an earlier day ("Oct 5"): calm, not red, because
 * a forgotten order is stale, not late — and the day tells two orders with the same daily number apart.
 */
export type OrderAge = { kind: 'minutes'; minutes: number; tone: StatusTone } | { kind: 'hours'; hours: number; tone: StatusTone } | { kind: 'day'; day: string; tone: 'neutral' };

export function orderAge(placedIso: string, now: Date): OrderAge {
  const minutes = minutesSince(placedIso, now);
  const placedDay = manilaDate(new Date(placedIso));
  if (placedDay !== manilaDate(now)) return { kind: 'day', day: formatDayLabel(placedDay), tone: 'neutral' };
  if (minutes >= 60) return { kind: 'hours', hours: Math.floor(minutes / 60), tone: 'destructive' };
  return { kind: 'minutes', minutes, tone: ageTone(minutes) };
}

/**
 * The age level a kitchen ticket shows (grey → amber → red), with this device's thresholds. An order left open from
 * an earlier day is stale ("Check"), never late.
 */
export function ticketAgeLevel(placedIso: string, now: Date, thresholds: Readonly<OrderAgeThresholds> = DEFAULT_ORDER_AGE_THRESHOLDS): OrderAgeLevel {
  if (manilaDate(new Date(placedIso)) !== manilaDate(now)) return 'stale';
  return orderAgeLevel(minutesSince(placedIso, now), thresholds);
}

/** Whole minutes from `fromIso` to `now`. */
export function minutesSince(fromIso: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(fromIso).getTime()) / 60_000));
}

// --- customer timeline --------------------------------------------------------------------------

/** The steps a customer sees for this fulfillment (end states other than completed end the list). */
export function timelineSteps(fulfillment: FulfillmentType): OrderStatus[] {
  return goesOut(fulfillment) ? ['placed', 'in_prep', 'ready', 'out', 'completed'] : ['placed', 'in_prep', 'ready', 'completed'];
}

// --- items in two lines -------------------------------------------------------------------------

export interface SummaryItem {
  qty: number;
  item_name: string;
  variant_name: string;
}

/** "2× Iced Latte Large", "1× Ensaymada" … up to `max`, then "+N more". The default variant name is left out. */
export function itemsSummary(items: readonly SummaryItem[], max = 2): { lines: string[]; more: number } {
  const lines = items.slice(0, max).map((item) => {
    const variant = item.variant_name && item.variant_name !== 'Regular' ? ` ${item.variant_name}` : '';
    return `${String(item.qty)}× ${item.item_name}${variant}`;
  });
  return { lines, more: Math.max(0, items.length - max) };
}
