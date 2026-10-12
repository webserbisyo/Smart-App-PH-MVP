import {
  FULFILLMENTS,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  WORDS,
  ageLabel,
  flowFor,
  formatManilaTime,
  isLate,
  minutesSince,
  nextActions,
  timelineSteps,
} from '@smartapp/core';
import type { Fulfillment, OrderStatus, PaymentMethod, PaymentStatus, RuleOrder } from '@smartapp/core';
import { OrderCard } from '@smartapp/ui/patterns/OrderCard';
import type { OrderCardAction, OrderCardOrder } from '@smartapp/ui/patterns/OrderCard';
import { OrderLines } from '@smartapp/ui/patterns/OrderLines';
import type { OrderLinesLine } from '@smartapp/ui/patterns/OrderLines';
import { OrderTimeline } from '@smartapp/ui/patterns/OrderTimeline';
import { OrderStatusBadge, PaymentBadge } from '@smartapp/ui/patterns/StatusBadge';

import { Demo } from './Demo';

// Sample orders here are kit-only demo content (a developer page), not a mock data layer.

const words = WORDS.order;
const SETTINGS = { payLaterPickup: false };
/** One "now" for the whole page, so ages and Late do not change between renders. */
const KIT_NOW = new Date();

function minutesAgo(minutes: number): string {
  return new Date(KIT_NOW.getTime() - minutes * 60_000).toISOString();
}

type KitOrder = OrderCardOrder & RuleOrder;

const LINES: KitOrder['lines'] = [
  { qty: 2, itemName: 'Iced Latte', variantName: 'Large' },
  { qty: 1, itemName: 'Ensaymada', variantName: words.defaultVariant },
  { qty: 3, itemName: 'Ham and Cheese Croissant', variantName: words.defaultVariant },
];

let nextNo = 1;

function kitOrder(
  fulfillment: Fulfillment,
  status: OrderStatus,
  paymentStatus: PaymentStatus,
  paymentMethod: PaymentMethod,
  extra: Partial<Pick<KitOrder, 'placedAt' | 'pickupAt' | 'customerName' | 'lines'>> = {},
): KitOrder {
  nextNo += 1;
  return {
    orderNo: nextNo,
    customerName: 'Maria Santos',
    fulfillment,
    status,
    paymentStatus,
    paymentMethod,
    total: 34_500,
    lines: LINES,
    placedAt: minutesAgo(6),
    pickupAt: null,
    ...extra,
  };
}

function actionsFor(order: RuleOrder): OrderCardAction[] {
  return nextActions(order, SETTINGS).map((action) => ({
    key: action,
    label: words.action[action],
    onSelect: () => {
      // Demo: the screens call the order step here.
    },
  }));
}

function timeText(order: RuleOrder): string {
  return order.pickupAt ? words.pickupAt(formatManilaTime(order.pickupAt)) : ageLabel(minutesSince(order.placedAt, KIT_NOW));
}

/** The five cases P4.0 is tested on: one main button each, from `nextActions`. */
const MAIN_STEP_CASES: { expect: string; order: KitOrder }[] = [
  { expect: 'Verify payment', order: kitOrder('pickup', 'placed', 'pending', 'gcash') },
  { expect: 'Mark paid', order: kitOrder('walk_in', 'placed', 'unpaid', 'cash', { lines: LINES.slice(0, 1) }) },
  { expect: 'Mark ready', order: kitOrder('pickup', 'preparing', 'paid', 'maya', { pickupAt: minutesAgo(-20) }) },
  { expect: 'Out for delivery', order: kitOrder('delivery', 'ready', 'unpaid', 'cod') },
  { expect: 'Complete', order: kitOrder('delivery', 'out_for_delivery', 'paid', 'gcash') },
];

const LATE_ORDER = kitOrder('pickup', 'placed', 'unpaid', 'cash', {
  placedAt: minutesAgo(65),
  customerName: 'Juan Miguel dela Cruz-Villanueva y Santos',
});

const END_STATUSES: readonly OrderStatus[] = ['cancelled', 'expired'];

/** Every status of every fulfillment (out for delivery only exists for delivery). */
const MATRIX: KitOrder[] = FULFILLMENTS.flatMap((fulfillment) =>
  [...flowFor(fulfillment), ...END_STATUSES].map((status) =>
    kitOrder(fulfillment, status, status === 'completed' ? 'paid' : 'unpaid', fulfillment === 'delivery' ? 'cod' : 'cash'),
  ),
);

const RECEIPT_LINES: OrderLinesLine[] = [
  { itemName: 'Iced Latte', variantName: 'Large', qty: 2, lineTotal: 29_000, note: 'Less ice', options: [{ name: 'Oat milk' }, { name: 'Extra shot' }] },
  { itemName: 'Ensaymada', variantName: words.defaultVariant, qty: 1, lineTotal: 6_500, note: null, options: [] },
  { itemName: 'Ube Cheese Pandesal Family Box with Extra Queso de Bola', variantName: '12 pieces', qty: 1, lineTotal: 1_234_500, note: null, options: [] },
];

function timelineFor(fulfillment: Fulfillment, status: OrderStatus, reached: readonly OrderStatus[]) {
  const events = reached.map((toStatus, index) => ({ toStatus, createdAt: minutesAgo(25 - index * 7) }));
  return timelineSteps({ status, fulfillment, placedAt: minutesAgo(30) }, events);
}

/** Orders: badges, lines, timeline and the order card. */
export function OrderDemos() {
  return (
    <>
      <Demo name="OrderStatusBadge: every status, and Late">
        {() => (
          <div className="flex flex-wrap gap-2">
            {ORDER_STATUSES.map((status) => (
              <OrderStatusBadge key={status} status={status} />
            ))}
            <OrderStatusBadge status="preparing" late />
          </div>
        )}
      </Demo>

      <Demo name="PaymentBadge: every payment status and method">
        {() => (
          <div className="flex flex-col gap-2">
            {PAYMENT_METHODS.map((method) => (
              <div key={method} className="flex flex-wrap items-center gap-2">
                <span className="w-28 text-xs text-muted-foreground">{words.method[method]}</span>
                {PAYMENT_STATUSES.map((status) => (
                  <PaymentBadge key={status} status={status} method={method} />
                ))}
              </div>
            ))}
          </div>
        )}
      </Demo>

      <Demo name="OrderLines">
        {() => (
          <OrderLines
            lines={RECEIPT_LINES}
            totals={{ subtotal: 1_270_000, deliveryFee: 5_000, discount: 12_000, total: 1_263_000 }}
            words={words}
            className="w-full max-w-md"
          />
        )}
      </Demo>

      <Demo name="OrderTimeline">
        {() => (
          <div className="flex w-full flex-col gap-6">
            <OrderTimeline
              steps={timelineFor('delivery', 'out_for_delivery', ['preparing', 'ready', 'out_for_delivery'])}
              labels={words.status}
              formatTime={formatManilaTime}
              orientation="horizontal"
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <OrderTimeline steps={timelineFor('pickup', 'preparing', ['preparing'])} labels={words.status} formatTime={formatManilaTime} />
              <OrderTimeline steps={timelineFor('pickup', 'cancelled', ['preparing', 'cancelled'])} labels={words.status} formatTime={formatManilaTime} />
            </div>
          </div>
        )}
      </Demo>

      <Demo name="OrderCard: the main step from nextActions">
        {() => (
          <div className="grid w-full gap-3 sm:grid-cols-2">
            {MAIN_STEP_CASES.map(({ expect, order }) => (
              <div key={expect} className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-muted-foreground">Expect: {expect}</span>
                <OrderCard order={order} actions={actionsFor(order)} timeText={timeText(order)} late={isLate(order, KIT_NOW)} words={words} />
              </div>
            ))}
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-xs text-muted-foreground">Late, long name</span>
              <OrderCard order={LATE_ORDER} actions={actionsFor(LATE_ORDER)} timeText={timeText(LATE_ORDER)} late={isLate(LATE_ORDER, KIT_NOW)} words={words} />
            </div>
          </div>
        )}
      </Demo>

      <Demo name="OrderCard compact: every status by fulfillment">
        {() => (
          <div className="grid w-full gap-2 sm:grid-cols-2">
            {MATRIX.map((order) => (
              <OrderCard key={order.orderNo} order={order} actions={[]} timeText={timeText(order)} words={words} variant="compact" />
            ))}
          </div>
        )}
      </Demo>
    </>
  );
}
