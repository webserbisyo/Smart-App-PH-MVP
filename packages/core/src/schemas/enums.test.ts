import { describe, expect, it } from 'vitest';

import {
  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
  BUSINESS_TYPES,
  CashMethod,
  CONSENT_CHANNELS,
  FULFILLMENTS,
  ITEM_STATUSES,
  LINE_PROBLEMS,
  LOYALTY_REASONS,
  MEMBER_ROLES,
  ORDER_ACTORS,
  ORDER_EVENT_KINDS,
  ORDER_STATUSES,
  OrderStatus,
  PAYMENT_METHODS,
  PAYMENT_REVIEW_STATUSES,
  PAYMENT_STATUSES,
  SHOP_STATUSES,
  TransferMethod,
} from './enums';

describe('enums', () => {
  it('match the agreed closed lists exactly', () => {
    expect(BUSINESS_TYPES).toEqual(['food', 'retail']);
    expect(SHOP_STATUSES).toEqual(['pending', 'active', 'suspended']);
    expect(FULFILLMENTS).toEqual(['walk_in', 'pickup', 'delivery']);
    expect(ORDER_STATUSES).toEqual([
      'placed',
      'preparing',
      'ready',
      'out_for_delivery',
      'completed',
      'cancelled',
      'expired',
    ]);
    expect(PAYMENT_STATUSES).toEqual(['unpaid', 'pending', 'paid']);
    expect(PAYMENT_METHODS).toEqual(['cash', 'cod', 'gcash', 'maya', 'bank']);
    expect(PAYMENT_REVIEW_STATUSES).toEqual(['pending', 'confirmed', 'rejected']);
    expect(ITEM_STATUSES).toEqual(['active', 'hidden', 'archived']);
    expect(LOYALTY_REASONS).toEqual(['earned', 'redeemed', 'reversed', 'manual', 'welcome']);
    expect(MEMBER_ROLES).toEqual(['owner']);
    expect(ORDER_EVENT_KINDS).toEqual(['status', 'payment_submitted', 'payment_confirmed', 'payment_rejected']);
    expect(ORDER_ACTORS).toEqual(['customer', 'owner', 'system']);
    expect(LINE_PROBLEMS).toEqual(['item_unavailable', 'out_of_stock', 'invalid_options']);
    expect(CONSENT_CHANNELS).toEqual(['privacy', 'sms', 'email', 'push']);
    expect(AUDIT_ACTIONS).toEqual(['payment_approved', 'payment_rejected', 'payment_recorded', 'order_cancelled', 'stock_set']);
    expect(AUDIT_TARGET_TYPES).toEqual(['order', 'payment', 'variant']);
  });
  it('reject values from later phases', () => {
    expect(OrderStatus.safeParse('voided').success).toBe(false);
  });
  it('split payment methods into transfer and cash', () => {
    expect(TransferMethod.options).toEqual(['gcash', 'maya', 'bank']);
    expect(CashMethod.options).toEqual(['cash', 'cod']);
  });
});
