// The orders export (P5.6): one CSV row per order, Manila date and time, pesos with two decimals.
import type { BoardOrder } from './contracts/db-functions';
import { toCsv } from './csv';
import { pesoDecimal } from './money';
import type { OrderLine } from './schemas/order-line';
import { manilaParts, minutesToTime, ticketNo } from './time';
import { WORDS } from './words';

/** "2x Iced Latte, Large (Extra shot)"; the default variant's name and empty choices are left out. */
export function orderLineText(line: OrderLine): string {
  const words = WORDS.order;
  const summary = words.lineSummary(line.qty, line.itemName, line.variantName === words.defaultVariant ? null : line.variantName);
  return line.options.length === 0 ? summary : `${summary} (${line.options.map((option) => option.name).join(', ')})`;
}

/** One order as CSV cells, in the order of `WORDS.dashboard.reports.csv.headers`. */
export function orderCsvRow({ order, lines }: BoardOrder): string[] {
  const words = WORDS.order;
  const placed = manilaParts(order.placedAt);
  return [
    ticketNo(order.orderNo),
    placed.date,
    minutesToTime(placed.minutes),
    words.fulfillment[order.fulfillment],
    order.customerName,
    lines.map(orderLineText).join('; '),
    pesoDecimal(order.subtotal),
    pesoDecimal(order.discountTotal),
    pesoDecimal(order.deliveryFee),
    pesoDecimal(order.total),
    words.method[order.paymentMethod],
    words.payment[order.paymentStatus],
    words.status[order.status],
  ];
}

/** The export: a header row, then one row per order in the order given. */
export function ordersCsv(orders: readonly BoardOrder[]): string {
  return toCsv([WORDS.dashboard.reports.csv.headers, ...orders.map(orderCsvRow)]);
}
