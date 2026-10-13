import { describe, expect, it } from 'vitest';

import {
  averageOrder,
  countsAsOrder,
  customerCsvRow,
  customersCsv,
  dailySales,
  hourLabel,
  hourlySales,
  isSale,
  orderCsvRow,
  orderLineText,
  ordersCsv,
  reportDates,
  reportRangeOf,
} from './reports';
import type { Order } from './schemas/order';
import { customer, order, orderLine } from './test/samples';
import { WORDS } from './words';

describe('orderLineText', () => {
  it('shows quantity, item, variant and choices', () => {
    expect(orderLineText(orderLine)).toBe('2x Iced Latte, Large (Extra shot)');
  });

  it('leaves out the default variant and empty choices', () => {
    expect(orderLineText({ ...orderLine, variantName: 'Regular', options: [], qty: 1, itemName: 'Ensaymada' })).toBe('1x Ensaymada');
  });
});

describe('orderCsvRow', () => {
  it('has one cell per header, in Manila time and pesos', () => {
    const row = orderCsvRow({ order: { ...order, placedAt: '2026-10-11T15:30:00+00:00', discountTotal: 5000, total: 31000 }, lines: [orderLine] });
    expect(row).toHaveLength(WORDS.dashboard.reports.csv.headers.length);
    expect(row).toEqual([
      '#042',
      '2026-10-11',
      '23:30',
      'Pickup',
      'Maria Santos',
      '2x Iced Latte, Large (Extra shot)',
      '360.00',
      '50.00',
      '0.00',
      '310.00',
      'GCash',
      'Paid',
      'Preparing',
    ]);
  });

  it('puts an order at 00:30 Manila on its Manila date', () => {
    const row = orderCsvRow({ order: { ...order, placedAt: '2026-10-11T16:30:00+00:00' }, lines: [] });
    expect(row.slice(1, 3)).toEqual(['2026-10-12', '00:30']);
  });
});

describe('ordersCsv', () => {
  it('starts with the header row and quotes the items', () => {
    const csv = ordersCsv([{ order, lines: [orderLine, { ...orderLine, itemName: 'Ensaymada', variantName: 'Regular', options: [], qty: 1 }] }]);
    const [header, first] = csv.split('\r\n');
    expect(header).toBe(WORDS.dashboard.reports.csv.headers.join(','));
    expect(first).toContain('"2x Iced Latte, Large (Extra shot); 1x Ensaymada"');
  });
});

describe('isSale and countsAsOrder (decision P5-12)', () => {
  it('sales are paid orders that were not cancelled or expired', () => {
    expect(isSale({ status: 'completed', paymentStatus: 'paid' })).toBe(true);
    expect(isSale({ status: 'preparing', paymentStatus: 'pending' })).toBe(false);
    expect(isSale({ status: 'cancelled', paymentStatus: 'paid' })).toBe(false);
    expect(isSale({ status: 'expired', paymentStatus: 'unpaid' })).toBe(false);
  });

  it('every order counts but an expired one', () => {
    expect(countsAsOrder({ status: 'cancelled' })).toBe(true);
    expect(countsAsOrder({ status: 'expired' })).toBe(false);
  });
});

describe('hourlySales', () => {
  // 08:10, 08:50, 10:05 and 10:30 Manila, one cancelled; 13:00 expired.
  const at = (time: string) => `2026-10-12T${time}:00+08:00`;
  const orders: Pick<Order, 'placedAt' | 'status' | 'paymentStatus' | 'total'>[] = [
    { placedAt: at('08:10'), status: 'completed', paymentStatus: 'paid', total: 12000 },
    { placedAt: at('08:50'), status: 'cancelled', paymentStatus: 'paid', total: 9000 },
    { placedAt: at('10:05'), status: 'preparing', paymentStatus: 'paid', total: 15000 },
    { placedAt: at('10:30'), status: 'placed', paymentStatus: 'pending', total: 7000 },
    { placedAt: at('13:00'), status: 'expired', paymentStatus: 'unpaid', total: 5000 },
  ];

  it('gives one bar per Manila hour from the first order to the last, gaps as zero', () => {
    expect(hourlySales(orders)).toEqual([
      { key: '8', label: '8 AM', sales: 12000, orders: 2 },
      { key: '9', label: '9 AM', sales: 0, orders: 0 },
      { key: '10', label: '10 AM', sales: 15000, orders: 2 },
    ]);
  });

  it('sums to the same totals as the day report', () => {
    const bars = hourlySales(orders);
    expect(bars.reduce((sum, bar) => sum + bar.sales, 0)).toBe(27000);
    expect(bars.reduce((sum, bar) => sum + bar.orders, 0)).toBe(4);
  });

  it('is empty on a day with no orders, or only expired ones', () => {
    expect(hourlySales([])).toEqual([]);
    expect(hourlySales(orders.slice(4))).toEqual([]);
  });

  it('uses Manila hours (00:30 Manila is 16:30 UTC the day before)', () => {
    expect(hourlySales([{ placedAt: '2026-10-11T16:30:00Z', status: 'completed', paymentStatus: 'paid', total: 100 }])[0]?.label).toBe('12 AM');
  });
});

describe('hourLabel, dailySales and averageOrder', () => {
  it('words hours on a 12-hour clock', () => {
    expect([0, 9, 12, 13, 23].map(hourLabel)).toEqual(['12 AM', '9 AM', '12 PM', '1 PM', '11 PM']);
  });

  it('labels report days', () => {
    expect(dailySales([{ date: '2026-10-04', orders: 3, sales: 12000 }])).toEqual([{ key: '2026-10-04', label: 'Sun, Oct 4', sales: 12000, orders: 3 }]);
  });

  it('divides sales by paid orders, 0 when none', () => {
    expect(averageOrder(51000, 4)).toBe(12750);
    expect(averageOrder(10000, 3)).toBe(3333);
    expect(averageOrder(0, 0)).toBe(0);
  });
});

describe('reportDates and reportRangeOf', () => {
  it('ends every period today, Manila dates, both ends included', () => {
    expect(reportDates('today', '2026-10-13')).toEqual({ from: '2026-10-13', to: '2026-10-13' });
    expect(reportDates('week', '2026-10-13')).toEqual({ from: '2026-10-07', to: '2026-10-13' });
    expect(reportDates('month', '2026-03-01')).toEqual({ from: '2026-01-31', to: '2026-03-01' });
  });

  it('reads the toggle value', () => {
    expect(reportRangeOf('week')).toBe('week');
    expect(reportRangeOf(undefined)).toBeNull();
    expect(reportRangeOf('year')).toBeNull();
  });
});

describe('customerCsvRow and customersCsv', () => {
  const row = { ...customer, memberSince: '2026-10-01T16:30:00Z', lastOrderAt: '2026-10-11T15:30:00Z', stamps: 3 };

  it('has one cell per header: readable mobile, Manila dates, pesos', () => {
    const cells = customerCsvRow(row);
    expect(cells).toHaveLength(WORDS.dashboard.customers.csv.headers.length);
    expect(cells).toEqual(['Maria Santos', '0917 123 4567', 'Member', '2026-10-02', '5', '2340.00', '2026-10-11', '3']);
  });

  it('marks guests and leaves their dates empty', () => {
    expect(customerCsvRow({ ...row, memberSince: null, lastOrderAt: null, userId: null })).toEqual(['Maria Santos', '0917 123 4567', 'Guest', '', '5', '2340.00', '', '3']);
  });

  it('starts with the header row and keeps names that look like formulas as text', () => {
    const [header, first] = customersCsv([{ ...row, name: '=HYPERLINK("x")' }]).split('\r\n');
    expect(header).toBe('Name,Mobile,Type,Member since,Orders,Total spent,Last order,Stamps');
    expect(first?.startsWith(`"'=HYPERLINK(""x"")"`)).toBe(true);
  });
});
