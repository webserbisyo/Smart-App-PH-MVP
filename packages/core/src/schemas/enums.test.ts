import { describe, expect, it } from 'vitest';

import {
  ANNOUNCEMENT_TONES,
  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
  BANNER_KINDS,
  BUSINESS_TYPES,
  CashMethod,
  CONSENT_CHANNELS,
  DELIVERY_PROVIDERS,
  FULFILLMENTS,
  ITEM_STATUSES,
  LINE_PROBLEMS,
  LOYALTY_REASONS,
  MEMBER_ROLES,
  ORDER_ACTORS,
  ORDER_EVENT_KINDS,
  ORDER_MESSAGE_KINDS,
  ORDER_MESSAGE_SENDERS,
  ORDER_STATUSES,
  OrderStatus,
  OUTBOX_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_REVIEW_STATUSES,
  PAYMENT_STATUSES,
  REWARD_CLAIM_STATUSES,
  REWARD_KINDS,
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
    expect(BANNER_KINDS).toEqual(['image', 'youtube']);
    expect(ANNOUNCEMENT_TONES).toEqual(['info', 'promo', 'warning']);
    expect(REWARD_KINDS).toEqual(['discount', 'free_item', 'custom']);
    expect(REWARD_CLAIM_STATUSES).toEqual(['pending', 'given', 'cancelled']);
    expect(ORDER_MESSAGE_SENDERS).toEqual(['customer', 'owner', 'system']);
    expect(ORDER_MESSAGE_KINDS).toEqual(['text', 'image', 'payment_proof', 'status']);
    expect(DELIVERY_PROVIDERS).toEqual(['own', 'lalamove', 'grab', 'other']);
    expect(OUTBOX_STATUSES).toEqual(['queued', 'sent', 'failed']);
  });
  it('reject values from later phases', () => {
    expect(OrderStatus.safeParse('voided').success).toBe(false);
  });
  it('split payment methods into transfer and cash', () => {
    expect(TransferMethod.options).toEqual(['gcash', 'maya', 'bank']);
    expect(CashMethod.options).toEqual(['cash', 'cod']);
  });
});

