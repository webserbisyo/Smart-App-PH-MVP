import type { Storefront } from './contracts/db-functions';
import { mapsLink } from './geo';
import { formatPeso } from './money';
import type { Fulfillment, PaymentMethod } from './schemas/enums';
import { FULFILLMENTS } from './schemas/enums';
import type { OrderLine } from './schemas/order-line';
import type { Order } from './schemas/order';
import type { Pin } from './schemas/pin';
import { addDays, formatManilaTime, manilaDate, manilaInstant, manilaParts, minutesToTime, openState, ticketNo } from './time';
import type { WeekdayHours } from './time';
import { WORDS } from './words';

// Checkout and receipt rules (P4.4). The database decides (place_order); these only show the customer the choices
// it will accept, so nothing on the screen is a dead end (ux-plan 3.2, Hick).

type ShopSettings = Storefront['shop']['settings'];

/** The order types the shop has switched on, in the usual order. */
export function availableFulfillments(settings: Pick<ShopSettings, 'walkInEnabled' | 'pickupEnabled' | 'deliveryEnabled'>): Fulfillment[] {
  const on: Record<Fulfillment, boolean> = {
    walk_in: settings.walkInEnabled,
    pickup: settings.pickupEnabled,
    delivery: settings.deliveryEnabled,
  };
  return FULFILLMENTS.filter((fulfillment) => on[fulfillment]);
}

/**
 * The payment methods an order type allows, the same rule as place_order: walk-in pays cash or by transfer; pickup
 * by transfer, or cash when the shop lets customers pay at pickup; delivery by transfer, or cash on delivery when
 * the shop allows it. A transfer method shows only when the shop has an active account for it.
 */
export function allowedPaymentMethods(
  fulfillment: Fulfillment,
  settings: Pick<ShopSettings, 'codEnabled' | 'payLaterPickup'>,
  accounts: readonly Pick<Storefront['paymentAccounts'][number], 'method' | 'isActive'>[],
): PaymentMethod[] {
  const transfers = (['gcash', 'maya', 'bank'] as const).filter((method) =>
    accounts.some((account) => account.method === method && account.isActive),
  );
  const cash: PaymentMethod[] =
    fulfillment === 'walk_in'
      ? ['cash']
      : fulfillment === 'pickup'
        ? settings.payLaterPickup
          ? ['cash']
          : []
        : settings.codEnabled
          ? ['cod']
          : [];
  return [...cash, ...transfers];
}

/**
 * The database takes a pickup time at least 15 minutes after the order is placed. The first slot is 20 minutes out,
 * so a customer who takes a few minutes to fill in the form still gets the time they chose.
 */
export const PICKUP_LEAD_MINUTES = 20;
export const PICKUP_STEP_MINUTES = 15;
/** The last slot is at least this long before closing, so the shop has time to hand it over. */
export const PICKUP_CUTOFF_MINUTES = 15;

export interface PickupSlot {
  /** The instant (ISO, +08:00) sent as `pickupAt`. */
  at: string;
  /** `today` or `tomorrow` in Manila. */
  day: 'today' | 'tomorrow';
  /** `3:30 PM` */
  label: string;
}

/**
 * Pickup times today and tomorrow in Manila, on the quarter hour, at least 20 minutes from now, while the shop is
 * open (the same open rule as the database: closed days, overnight hours) and at least 15 minutes before it closes.
 */
export function pickupSlots(hours: readonly WeekdayHours[], closures: readonly { closedOn: string }[], now: Date): PickupSlot[] {
  const step = PICKUP_STEP_MINUTES * 60_000;
  const today = manilaDate(now);
  const tomorrow = addDays(today, 1);
  // Manila has no daylight saving, so slots on the quarter hour are quarter hours of UTC too.
  let at = Math.ceil((now.getTime() + PICKUP_LEAD_MINUTES * 60_000) / step) * step;
  const slots: PickupSlot[] = [];
  for (;;) {
    const instant = new Date(at);
    const date = manilaDate(instant);
    if (date !== today && date !== tomorrow) break;
    const state = openState(hours, closures, instant);
    if (state.isOpen && state.closesAt !== null && new Date(state.closesAt).getTime() - at >= PICKUP_CUTOFF_MINUTES * 60_000) {
      slots.push({
        at: manilaInstant(date, minutesToTime(manilaParts(instant).minutes)),
        day: date === today ? 'today' : 'tomorrow',
        label: formatManilaTime(instant),
      });
    }
    at += step;
  }
  return slots;
}

/** "Pickup 3:30 PM" (tomorrow added when it is), "Pickup", "Walk-in", "Delivery". */
export function fulfillmentText(order: Pick<Order, 'fulfillment' | 'pickupAt'>, now: Date): string {
  const words = WORDS.order;
  if (order.fulfillment !== 'pickup' || order.pickupAt === null) return words.fulfillment[order.fulfillment];
  const time = formatManilaTime(order.pickupAt);
  const tomorrow = manilaDate(order.pickupAt) === addDays(manilaDate(now), 1);
  return words.pickupAt(tomorrow ? WORDS.shared.shop.tomorrow(time) : time);
}

type MessageOrder = Pick<Order, 'orderNo' | 'fulfillment' | 'pickupAt' | 'total' | 'deliveryFee' | 'paymentMethod' | 'paymentStatus'> & {
  deliveryPin?: Pin | null | undefined;
  deliveryLat?: number | null | undefined;
  deliveryLng?: number | null | undefined;
};
type MessageLine = Pick<OrderLine, 'qty' | 'itemName' | 'variantName' | 'lineTotal' | 'options'>;

/**
 * The order as plain text for Messenger and "Copy order details" (paper 6.6):
 *
 *     Hi! Order #042 (Pickup 3:30 PM)
 *     2x Iced Latte (Large) - ₱300
 *     1x Ensaymada - ₱45
 *     Total: ₱345 · GCash (proof uploaded)
 *     Pin: https://www.google.com/maps?q=14.5995,120.9842
 *     Track: https://shop.webserbisyo.com/juans-cafe/o/abc123
 */
export function messengerOrderText(order: MessageOrder, lines: readonly MessageLine[], trackUrl: string, now: Date): string {
  const words = WORDS.storefront.receipt.message;
  const lineText = lines.map((line) => {
    const parts = [
      ...(line.variantName === WORDS.order.defaultVariant ? [] : [line.variantName]),
      ...line.options.map((option) => option.name),
    ];
    const name = parts.length === 0 ? line.itemName : `${line.itemName} (${parts.join(', ')})`;
    return `${WORDS.order.lineQty(line.qty)} ${name} - ${formatPeso(line.lineTotal)}`;
  });
  const fee = order.deliveryFee > 0 ? [`${WORDS.order.deliveryFee} - ${formatPeso(order.deliveryFee)}`] : [];
  const paid = order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid' ? words.paid.cod : words.paid[order.paymentStatus];
  const pin =
    order.deliveryPin ??
    (order.deliveryLat !== null && order.deliveryLat !== undefined && order.deliveryLng !== null && order.deliveryLng !== undefined
      ? { lat: order.deliveryLat, lng: order.deliveryLng }
      : null);
  const pinLine = pin ? [`Pin: ${mapsLink(pin)}`] : [];
  return [
    words.greeting(ticketNo(order.orderNo), fulfillmentText(order, now)),
    ...lineText,
    ...fee,
    words.total(formatPeso(order.total), WORDS.order.method[order.paymentMethod], paid),
    ...pinLine,
    words.track(trackUrl),
  ].join('\n');
}

/** Opens a chat with the shop's page, the order text filled in. */
export function messengerLink(username: string, text: string): string {
  return `https://m.me/${encodeURIComponent(username)}?text=${encodeURIComponent(text)}`;
}

/** Opens Messenger's share sheet with the shop link (Home's "Share on Messenger", phones only, decision P4-40). */
export function messengerShareLink(url: string): string {
  return `fb-messenger://share/?link=${encodeURIComponent(url)}`;
}
