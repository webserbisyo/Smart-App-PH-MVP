import { describe, expect, it } from 'vitest';

import { formatPeso } from './money';
import { orderEarnsStamp, rewardDiscount, rewardLabel, stampLine, stampProgress, stampRuleLine } from './stamps';
import { WORDS } from './words';

const rule = { isActive: true, stampsNeeded: 8 };

describe('stampProgress', () => {
  it('counts toward the next reward', () => {
    expect(stampProgress(0, rule)).toEqual({ filled: 0, stampsNeeded: 8, left: 8, rewardReady: false });
    expect(stampProgress(1, rule)).toEqual({ filled: 1, stampsNeeded: 8, left: 7, rewardReady: false });
    expect(stampProgress(7, rule)).toEqual({ filled: 7, stampsNeeded: 8, left: 1, rewardReady: false });
  });

  it('is ready at the goal and stays full past it', () => {
    expect(stampProgress(8, rule)).toEqual({ filled: 8, stampsNeeded: 8, left: 0, rewardReady: true });
    expect(stampProgress(11, rule)).toEqual({ filled: 8, stampsNeeded: 8, left: 0, rewardReady: true });
  });

  it('is null without an active stamp card, and never below zero', () => {
    expect(stampProgress(3, null)).toBeNull();
    expect(stampProgress(3, { ...rule, isActive: false })).toBeNull();
    expect(stampProgress(-2, rule)?.filled).toBe(0);
  });
});

describe('stamp words', () => {
  const card = { stampsNeeded: 10, rewardLabel: '₱100 off your order', minOrderTotal: 0, rewardAmount: 10000 };

  it('says the rule in one line, with the minimum only when there is one', () => {
    expect(stampRuleLine(card)).toBe('Buy 10, get ₱100 off your order');
    expect(stampRuleLine({ ...card, minOrderTotal: 15000 })).toBe('Buy 10, get ₱100 off your order (orders of ₱150 or more)');
  });

  it('counts the orders left, and says when the reward is ready', () => {
    const reward = card.rewardLabel;
    expect(stampLine({ filled: 8, stampsNeeded: 10, left: 2, rewardReady: false }, reward)).toBe('2 more orders to ₱100 off your order');
    expect(stampLine({ filled: 9, stampsNeeded: 10, left: 1, rewardReady: false }, reward)).toBe('1 more order to ₱100 off your order');
    expect(stampLine({ filled: 10, stampsNeeded: 10, left: 0, rewardReady: true }, reward)).toBe('Reward ready: ₱100 off your order');
  });

  it('names the reward from its amount', () => {
    expect(rewardLabel(10000)).toBe('₱100 off your order');
    expect(rewardLabel(5050)).toBe('₱50.50 off your order');
    expect(WORDS.storefront.stamps.use(formatPeso(10000))).toBe('Use ₱100 off');
  });

  it('estimates the reward, never more than the items', () => {
    expect(rewardDiscount(34500, card)).toBe(10000);
    expect(rewardDiscount(6000, card)).toBe(6000);
  });

  it('labels each stamp movement', () => {
    const words = WORDS.storefront.stamps;
    expect(words.reason.welcome).toBe('Welcome stamp');
    expect(words.reason.earned('#042')).toBe('Stamp from order #042');
    expect(words.delta(1)).toBe('+1');
    expect(words.delta(-10)).toBe('−10');
  });
});

describe('orderEarnsStamp', () => {
  const rule = { isActive: true, minOrderTotal: 15000 };
  const order = { status: 'placed' as const, subtotal: 20000, discountTotal: 0 };

  it('counts open and completed orders from the minimum, after the reward', () => {
    expect(orderEarnsStamp(order, rule)).toBe(true);
    expect(orderEarnsStamp({ ...order, status: 'completed' }, rule)).toBe(true);
    expect(orderEarnsStamp({ ...order, subtotal: 15000 }, rule)).toBe(true);
    expect(orderEarnsStamp({ ...order, discountTotal: 10000 }, rule)).toBe(false);
  });

  it('never counts cancelled or expired orders, or a shop without a stamp card', () => {
    expect(orderEarnsStamp({ ...order, status: 'cancelled' }, rule)).toBe(false);
    expect(orderEarnsStamp({ ...order, status: 'expired' }, rule)).toBe(false);
    expect(orderEarnsStamp(order, null)).toBe(false);
    expect(orderEarnsStamp(order, { ...rule, isActive: false })).toBe(false);
  });
});
