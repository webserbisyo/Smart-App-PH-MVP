import { describe, expect, it } from 'vitest';

import type { BoardOrder, Order } from '@smartapp/core';

import { findByNumber, groupBoard, newCount, parseTicket, searchOrders, stepCall } from './board';

const TENANT = '00000000-0000-4000-8000-000000000001';

function card(orderNo: number, customerName: string, extra: Partial<Order> = {}): BoardOrder {
  const order: Order = {
    id: crypto.randomUUID(),
    tenantId: TENANT,
    orderNo,
    businessDate: '2026-10-12',
    token: 'pvMJIPoFaPcsBDVxhwb7gA',
    fulfillment: 'walk_in',
    status: 'placed',
    paymentStatus: 'unpaid',
    paymentMethod: 'cash',
    customerId: null,
    customerName,
    customerPhone: '+639171234567',
    addressLine: null,
    landmark: null,
    deliveryZoneId: null,
    deliveryFee: 0,
    pickupAt: null,
    notes: null,
    subtotal: 15_000,
    discountTotal: 0,
    total: 15_000,
    trackingUrl: null,
    cancelReason: null,
    clientKey: crypto.randomUUID(),
    expiresAt: null,
    placedAt: '2026-10-12T01:00:00Z',
    paidAt: null,
    readyAt: null,
    completedAt: null,
    cancelledAt: null,
    ...extra,
  };
  return { order, lines: [] };
}

const orders: BoardOrder[] = [
  card(1, 'Maria Santos'),
  card(2, 'Jose Rizal', { status: 'preparing' }),
  card(3, 'Ana Cruz', { status: 'ready', paymentStatus: 'paid' }),
  card(4, 'Ben Reyes', { status: 'out_for_delivery', fulfillment: 'delivery', paymentMethod: 'cod' }),
  card(5, 'Carla Lim', { status: 'completed', paymentStatus: 'paid' }),
  card(6, 'Dino Tan', { status: 'completed', paymentStatus: 'paid' }),
  card(7, 'Ella Go', { status: 'cancelled' }),
  card(8, 'Fe Uy', { status: 'expired', paymentMethod: 'gcash' }),
  card(42, 'Maria Clara', { paymentStatus: 'pending', paymentMethod: 'gcash' }),
];

describe('groupBoard and newCount', () => {
  it('puts each order in its column, leaves cancelled and expired off, and shows the latest done first', () => {
    const columns = groupBoard(orders);
    const numbers = (column: BoardOrder[]) => column.map((entry) => entry.order.orderNo);
    expect(numbers(columns.new)).toEqual([1, 42]);
    expect(numbers(columns.preparing)).toEqual([2]);
    expect(numbers(columns.ready)).toEqual([3]);
    expect(numbers(columns.out)).toEqual([4]);
    expect(numbers(columns.done)).toEqual([6, 5]);
    expect(newCount(orders)).toBe(2);
  });
});

describe('parseTicket, searchOrders and findByNumber', () => {
  it('reads a ticket number the way people type it', () => {
    expect(parseTicket('42')).toBe(42);
    expect(parseTicket(' #042 ')).toBe(42);
    expect(parseTicket('042')).toBe(42);
    expect(parseTicket('Maria')).toBeNull();
    expect(parseTicket('')).toBeNull();
  });

  it('finds by number or by name', () => {
    expect(searchOrders(orders, '#042').map((entry) => entry.order.orderNo)).toEqual([42]);
    expect(searchOrders(orders, 'maria').map((entry) => entry.order.orderNo)).toEqual([1, 42]);
    expect(searchOrders(orders, '  ')).toHaveLength(orders.length);
    expect(findByNumber(orders, '3')?.order.customerName).toBe('Ana Cruz');
    expect(findByNumber(orders, '99')).toBeNull();
    expect(findByNumber(orders, 'Ana')).toBeNull();
  });
});

describe('stepCall', () => {
  it('turns each next step into its database call', () => {
    expect(stepCall('verify_payment', { fulfillment: 'pickup' })).toEqual({ kind: 'review' });
    expect(stepCall('mark_paid', { fulfillment: 'walk_in' })).toEqual({ kind: 'record', method: 'cash' });
    expect(stepCall('mark_paid', { fulfillment: 'delivery' })).toEqual({ kind: 'record', method: 'cod' });
    expect(stepCall('start', { fulfillment: 'walk_in' })).toEqual({ kind: 'advance', toStatus: 'preparing', askTracking: false });
    expect(stepCall('mark_ready', { fulfillment: 'pickup' })).toEqual({ kind: 'advance', toStatus: 'ready', askTracking: false });
    expect(stepCall('out_for_delivery', { fulfillment: 'delivery' })).toEqual({ kind: 'advance', toStatus: 'out_for_delivery', askTracking: true });
    expect(stepCall('complete', { fulfillment: 'walk_in' })).toEqual({ kind: 'advance', toStatus: 'completed', askTracking: false });
  });
});

// The board's columns and buttons come only from packages/core (boardColumn, nextActions): no file of the orders
// feature compares an order status itself.
const SOURCES = import.meta.glob<string>(['./**/*.ts', './**/*.tsx', '!./**/*.test.ts'], { query: '?raw', import: 'default', eager: true });

describe('no status logic in the feature', () => {
  it('reads every source file', () => {
    expect(Object.keys(SOURCES)).toEqual(expect.arrayContaining(['./board.ts', './screens/OrdersScreen.tsx', './components/BoardCard.tsx']));
  });

  it.each(Object.entries(SOURCES))('%s compares no status', (_path, source) => {
    expect(source).not.toMatch(/[sS]tatus\s*(===|!==|==|!=)/);
    // Words that are only statuses ('ready' and 'out_for_delivery' are also step and column names).
    expect(source).not.toMatch(/(===|!==)\s*'(placed|preparing|completed|cancelled|expired|unpaid|pending)'/);
    expect(source).not.toMatch(/case\s+'(placed|preparing|ready|out_for_delivery|completed|cancelled|expired)'/);
  });
});
