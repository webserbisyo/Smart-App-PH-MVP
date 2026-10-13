// The orders and customers exports (P5.6, P4.7) and the Reports numbers, by the definitions of decision P5-12.
import type { BoardOrder, SalesReport } from './contracts/db-functions';
import { toCsv } from './csv';
import { pesoDecimal } from './money';
import { formatPhPhone } from './phone';
import type { CustomerRow } from './schemas/customer-row';
import type { Order } from './schemas/order';
import type { OrderLine } from './schemas/order-line';
import { addDays, formatShortDate, manilaParts, minutesToTime, ticketNo } from './time';
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

type ReportOrder = Pick<Order, 'placedAt' | 'status' | 'paymentStatus' | 'total'>;

/** Counted in sales (decision P5-12): paid, and not cancelled or expired. */
export function isSale(order: Pick<Order, 'status' | 'paymentStatus'>): boolean {
  return order.paymentStatus === 'paid' && order.status !== 'cancelled' && order.status !== 'expired';
}

/** Counted as an order (decision P5-12): every order but an expired one. */
export function countsAsOrder(order: Pick<Order, 'status'>): boolean {
  return order.status !== 'expired';
}

/** One bar of the Reports chart: sales in centavos and the order count. */
export interface SalesBar {
  key: string;
  label: string;
  sales: number;
  orders: number;
}

/** `8` → `8 AM`, `13` → `1 PM`. */
export function hourLabel(hour: number): string {
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(twelve)} ${hour < 12 ? 'AM' : 'PM'}`;
}

/**
 * One day's orders as bars per Manila hour (Reports "Today"), from the first hour with an order to the last; empty
 * when no order counts. Same sums as `get_sales_report` for that day.
 */
export function hourlySales(orders: readonly ReportOrder[]): SalesBar[] {
  const counted = orders.filter(countsAsOrder);
  if (counted.length === 0) return [];
  const hours = counted.map((order) => Math.floor(manilaParts(order.placedAt).minutes / 60));
  const first = Math.min(...hours);
  const last = Math.max(...hours);
  const bars: SalesBar[] = [];
  for (let hour = first; hour <= last; hour += 1) {
    bars.push({ key: String(hour), label: hourLabel(hour), sales: 0, orders: 0 });
  }
  counted.forEach((order, index) => {
    const bar = bars[(hours[index] ?? first) - first];
    if (bar === undefined) return;
    bar.orders += 1;
    if (isSale(order)) bar.sales += order.total;
  });
  return bars;
}

/** The report's days as bars (Reports 7 and 30 days), labelled `Sun, Oct 4`. */
export function dailySales(days: SalesReport['days']): SalesBar[] {
  return days.map((day) => ({ key: day.date, label: formatShortDate(day.date), sales: day.sales, orders: day.orders }));
}

/** Average order in centavos: sales ÷ paid orders, 0 when none (decision P5-12). */
export function averageOrder(sales: number, paidOrders: number): number {
  return paidOrders === 0 ? 0 : Math.round(sales / paidOrders);
}

/** The Reports periods (ux-plan 5.16): no date pickers at launch. */
export const REPORT_RANGES = ['today', 'week', 'month'] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

/** The toggle's value → its period, or `null` (the toggle was cleared). */
export function reportRangeOf(value: string | undefined): ReportRange | null {
  return REPORT_RANGES.find((range) => range === value) ?? null;
}

/** The Manila dates of a period ending today: Today, the last 7 days or the last 30 days (both ends included). */
export function reportDates(range: ReportRange, today: string): { from: string; to: string } {
  const days: Record<ReportRange, number> = { today: 1, week: 7, month: 30 };
  return { from: addDays(today, 1 - days[range]), to: today };
}

/** One customer as CSV cells, in the order of `WORDS.dashboard.customers.csv.headers`. */
export function customerCsvRow(customer: CustomerRow): string[] {
  const words = WORDS.dashboard.customers.csv;
  return [
    customer.name,
    formatPhPhone(customer.phone),
    customer.memberSince === null ? words.guest : words.member,
    customer.memberSince === null ? '' : manilaParts(customer.memberSince).date,
    String(customer.orderCount),
    pesoDecimal(customer.totalSpent),
    customer.lastOrderAt === null ? '' : manilaParts(customer.lastOrderAt).date,
    String(customer.stamps),
  ];
}

/** The customers export: a header row, then one row per customer in the order given. */
export function customersCsv(customers: readonly CustomerRow[]): string {
  return toCsv([WORDS.dashboard.customers.csv.headers, ...customers.map(customerCsvRow)]);
}
