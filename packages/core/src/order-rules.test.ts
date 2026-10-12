import { describe, expect, it } from 'vitest';

import {
  ACTION_TO_STATUS,
  boardColumn,
  canCancel,
  canStartUnpaid,
  isLate,
  itemsSummary,
  nextActions,
  timelineSteps,
} from './order-rules';
import type { OrderAction, RuleOrder, RuleSettings } from './order-rules';
import { FULFILLMENTS, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from './schemas/enums';
import type { Fulfillment, PaymentMethod, PaymentStatus } from './schemas/enums';

const PLACED_AT = '2026-10-11T01:00:00Z';

function order(overrides: Partial<RuleOrder> = {}): RuleOrder {
  return {
    status: 'placed',
    paymentStatus: 'unpaid',
    paymentMethod: 'cash',
    fulfillment: 'walk_in',
    placedAt: PLACED_AT,
    pickupAt: null,
    ...overrides,
  };
}

const PAY_LATER: RuleSettings = { payLaterPickup: true };
const PAY_FIRST: RuleSettings = { payLaterPickup: false };

/** Cash is for the counter; cash on delivery only for delivery. */
function methodFits(method: PaymentMethod, fulfillment: Fulfillment): boolean {
  if (method === 'cod') return fulfillment === 'delivery';
  if (method === 'cash') return fulfillment !== 'delivery';
  return true;
}

/** Only transfers have a proof waiting to be checked. */
function paymentFits(status: PaymentStatus, method: PaymentMethod): boolean {
  return status !== 'pending' || (method !== 'cash' && method !== 'cod');
}

/** What taking an action does, the way the database will. */
function apply(current: RuleOrder, action: OrderAction): RuleOrder {
  if (action === 'verify_payment' || action === 'mark_paid') return { ...current, paymentStatus: 'paid' };
  const to = ACTION_TO_STATUS[action];
  if (!to) throw new Error(`no status for ${action}`);
  return { ...current, status: to };
}

describe('nextActions', () => {
  it.each<[string, RuleOrder, OrderAction]>([
    ['unpaid GCash with proof', order({ paymentMethod: 'gcash', paymentStatus: 'pending', fulfillment: 'pickup' }), 'verify_payment'],
    ['walk-in cash, new', order(), 'mark_paid'],
    ['preparing', order({ status: 'preparing', paymentStatus: 'paid' }), 'mark_ready'],
    ['ready delivery', order({ status: 'ready', fulfillment: 'delivery', paymentMethod: 'cod' }), 'out_for_delivery'],
    ['out and paid', order({ status: 'out_for_delivery', fulfillment: 'delivery', paymentStatus: 'paid', paymentMethod: 'gcash' }), 'complete'],
    ['out, cash on delivery not paid yet', order({ status: 'out_for_delivery', fulfillment: 'delivery', paymentMethod: 'cod' }), 'mark_paid'],
    ['pickup pay later, new', order({ fulfillment: 'pickup' }), 'start'],
    ['paid GCash, new', order({ paymentMethod: 'gcash', paymentStatus: 'paid', fulfillment: 'pickup' }), 'start'],
    ['ready walk-in, unpaid', order({ status: 'ready' }), 'mark_paid'],
  ])('%s: main step', (_name, input, main) => {
    expect(nextActions(input, PAY_LATER)[0]).toBe(main);
  });

  it('never offers Start on an unpaid transfer', () => {
    const transfer = order({ paymentMethod: 'maya', fulfillment: 'pickup' });
    expect(nextActions(transfer, PAY_LATER)).toEqual(['mark_paid']);
  });

  it('follows the pay later switch for pickup cash', () => {
    const pickup = order({ fulfillment: 'pickup' });
    expect(canStartUnpaid(pickup, PAY_LATER)).toBe(true);
    expect(canStartUnpaid(pickup, PAY_FIRST)).toBe(false);
    expect(nextActions(pickup, PAY_FIRST)).toEqual(['mark_paid']);
  });

  it('offers nothing on finished orders', () => {
    for (const status of ['completed', 'cancelled', 'expired'] as const) {
      expect(nextActions(order({ status, paymentStatus: 'paid' }), PAY_LATER)).toEqual([]);
    }
  });

  it('can finish every open order by taking the main step', () => {
    let checked = 0;
    for (const settings of [PAY_LATER, PAY_FIRST]) {
      for (const fulfillment of FULFILLMENTS) {
        for (const method of PAYMENT_METHODS) {
          if (!methodFits(method, fulfillment)) continue;
          for (const paymentStatus of PAYMENT_STATUSES) {
            if (!paymentFits(paymentStatus, method)) continue;
            for (const status of ORDER_STATUSES) {
              if (status === 'completed' || status === 'cancelled' || status === 'expired') continue;
              if (status === 'out_for_delivery' && fulfillment !== 'delivery') continue;
              let current = order({ status, fulfillment, paymentMethod: method, paymentStatus });
              for (let step = 0; step < 10 && current.status !== 'completed'; step += 1) {
                const [main] = nextActions(current, settings);
                if (!main) break;
                if (main === 'complete') expect(current.paymentStatus).toBe('paid');
                current = apply(current, main);
              }
              expect(current, `${status} ${fulfillment} ${method} ${paymentStatus}`).toMatchObject({
                status: 'completed',
                paymentStatus: 'paid',
              });
              checked += 1;
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it('only offers forward steps', () => {
    const order_ = order({ status: 'ready', paymentStatus: 'paid' });
    expect(nextActions(order_, PAY_LATER)).not.toContain('start');
    expect(nextActions(order_, PAY_LATER)).not.toContain('mark_ready');
  });
});

describe('board, cancel and late', () => {
  it('puts orders in their column', () => {
    expect(boardColumn({ status: 'placed' })).toBe('new');
    expect(boardColumn({ status: 'out_for_delivery' })).toBe('out');
    expect(boardColumn({ status: 'completed' })).toBe('done');
    expect(boardColumn({ status: 'expired' })).toBeNull();
  });

  it('cancels only open orders', () => {
    expect(canCancel({ status: 'ready' })).toBe(true);
    expect(canCancel({ status: 'completed' })).toBe(false);
  });

  it('is late after 15 minutes waiting, or after the pickup time', () => {
    const at = (minutes: number) => new Date(new Date(PLACED_AT).getTime() + minutes * 60_000);
    expect(isLate(order(), at(15))).toBe(false);
    expect(isLate(order(), at(16))).toBe(true);
    expect(isLate(order({ status: 'completed' }), at(60))).toBe(false);
    const pickup = order({ fulfillment: 'pickup', pickupAt: '2026-10-11T02:00:00Z' });
    expect(isLate(pickup, at(45))).toBe(false);
    expect(isLate(pickup, at(61))).toBe(true);
    expect(isLate(order({ status: 'ready' }), at(40))).toBe(false);
  });
});

describe('timelineSteps', () => {
  const events = [
    { toStatus: 'preparing' as const, createdAt: '2026-10-11T01:05:00Z' },
    { toStatus: 'ready' as const, createdAt: '2026-10-11T01:12:00Z' },
  ];

  it('marks done, current and upcoming steps', () => {
    const steps = timelineSteps({ status: 'ready', fulfillment: 'delivery', placedAt: PLACED_AT }, events);
    expect(steps.map((step) => [step.status, step.state])).toEqual([
      ['placed', 'done'],
      ['preparing', 'done'],
      ['ready', 'current'],
      ['out_for_delivery', 'upcoming'],
      ['completed', 'upcoming'],
    ]);
    expect(steps[1]?.at).toBe('2026-10-11T01:05:00Z');
    expect(steps[3]?.at).toBeNull();
  });

  it('shows a completed order as all done', () => {
    const steps = timelineSteps({ status: 'completed', fulfillment: 'walk_in', placedAt: PLACED_AT }, events);
    expect(steps.every((step) => step.state === 'done')).toBe(true);
    expect(steps).toHaveLength(4);
  });

  it('ends a cancelled order with the cancel step', () => {
    const steps = timelineSteps({ status: 'cancelled', fulfillment: 'pickup', placedAt: PLACED_AT }, [
      events[0] ?? { toStatus: 'preparing', createdAt: PLACED_AT },
      { toStatus: 'cancelled', createdAt: '2026-10-11T01:08:00Z' },
    ]);
    expect(steps.map((step) => [step.status, step.state])).toEqual([
      ['placed', 'done'],
      ['preparing', 'done'],
      ['cancelled', 'current'],
    ]);
  });
});

describe('itemsSummary', () => {
  it('shows two lines and how many more', () => {
    const summary = itemsSummary([
      { qty: 2, itemName: 'Iced Latte', variantName: 'Large' },
      { qty: 1, itemName: 'Ensaymada', variantName: 'Regular' },
      { qty: 1, itemName: 'Water', variantName: 'Regular' },
    ]);
    expect(summary).toEqual({ lines: ['2x Iced Latte, Large', '1x Ensaymada'], more: 1 });
  });
});
