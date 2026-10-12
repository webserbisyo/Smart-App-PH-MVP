import { describe, expect, it } from 'vitest';

import {
  addCartLine,
  canQuickAdd,
  choiceProblem,
  itemPrice,
  itemSoldOut,
  orderingBlock,
  priceCart,
  removeCartLine,
  setCartLineQty,
  variantAvailable,
} from './cart';
import type { StorefrontItem } from './contracts/db-functions';
import type { CartLine } from './schemas/cart-line';
import { ids, item, option, optionGroup, shop, variant } from './test/samples';

const regular = { ...variant, id: '11111111-1111-4111-8111-111111111111', name: 'Regular', price: 12000, sort: 0 };
const sugar = {
  ...optionGroup,
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Sugar level',
  minSelect: 1,
  maxSelect: 1,
  options: [
    { ...option, id: '33333333-3333-4333-8333-333333333333', groupId: '22222222-2222-4222-8222-222222222222', name: '50%', priceDelta: 0 },
  ],
};
const sugarId = sugar.options[0]?.id ?? '';

/** Iced Latte: Regular ₱120, Large ₱150; add-ons (Extra shot) optional; sugar level required. */
const latte: StorefrontItem = { ...item, photos: [], variants: [regular, variant], optionGroups: [optionGroup, sugar] };
const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  itemId: ids.item,
  variantId: ids.variant,
  optionIds: [ids.option, sugarId],
  qty: 1,
  note: null,
  ...overrides,
});

describe('availability and prices', () => {
  it('a variant is out when marked sold out or, when stock is counted, at 0', () => {
    expect(variantAvailable({ trackStock: false }, { isSoldOut: false, stockOnHand: null })).toBe(true);
    expect(variantAvailable({ trackStock: false }, { isSoldOut: true, stockOnHand: null })).toBe(false);
    expect(variantAvailable({ trackStock: true }, { isSoldOut: false, stockOnHand: 0 })).toBe(false);
    expect(variantAvailable({ trackStock: true }, { isSoldOut: false, stockOnHand: 3 })).toBe(true);
  });

  it('an item is sold out when no variant can be ordered', () => {
    expect(itemSoldOut(latte)).toBe(false);
    expect(itemSoldOut({ ...latte, variants: [{ ...regular, isSoldOut: true }] })).toBe(true);
  });

  it('shows the lowest price and whether prices differ', () => {
    expect(itemPrice(latte)).toEqual({ price: 12000, varies: true });
    expect(itemPrice({ ...latte, variants: [regular] })).toEqual({ price: 12000, varies: false });
  });

  it('quick add only with one available variant and nothing required', () => {
    expect(canQuickAdd(latte)).toBe(false);
    expect(canQuickAdd({ ...latte, variants: [regular], optionGroups: [optionGroup] })).toBe(true);
    expect(canQuickAdd({ ...latte, variants: [regular], optionGroups: [sugar] })).toBe(false);
    expect(canQuickAdd({ ...latte, variants: [{ ...regular, isSoldOut: true }], optionGroups: [] })).toBe(false);
  });

  it('names the first missing choice', () => {
    expect(choiceProblem(latte, null, [])).toEqual({ kind: 'variant' });
    expect(choiceProblem(latte, ids.variant, [])).toEqual({ kind: 'group', groupId: sugar.id, name: 'Sugar level' });
    expect(choiceProblem(latte, ids.variant, [sugarId])).toBeNull();
    expect(choiceProblem({ ...latte, variants: [{ ...variant, isSoldOut: true }] }, ids.variant, [sugarId])).toEqual({ kind: 'variant' });
  });
});

describe('cart lines', () => {
  it('the same item with the same options merges', () => {
    const lines = addCartLine(addCartLine([], line({ qty: 1 })), line({ qty: 2, optionIds: [sugarId, ids.option] }));
    expect(lines).toHaveLength(1);
    expect(lines[0]?.qty).toBe(3);
  });

  it('different options, variant or note make a new line', () => {
    let lines = addCartLine([], line());
    lines = addCartLine(lines, line({ optionIds: [sugarId] }));
    lines = addCartLine(lines, line({ variantId: regular.id }));
    lines = addCartLine(lines, line({ note: 'less ice' }));
    expect(lines).toHaveLength(4);
  });

  it('keeps quantities between 1 and 99', () => {
    expect(addCartLine([line({ qty: 98 })], line({ qty: 5 }))[0]?.qty).toBe(99);
    expect(setCartLineQty([line()], 0, 0)[0]?.qty).toBe(1);
    expect(setCartLineQty([line()], 0, 150)[0]?.qty).toBe(99);
    expect(removeCartLine([line(), line({ note: 'x' })], 0)).toEqual([line({ note: 'x' })]);
  });

  it('totals in centavos: variant plus add-ons, times quantity', () => {
    const cart = priceCart([latte], [line({ qty: 2 }), line({ variantId: regular.id, optionIds: [sugarId] })]);
    // Large ₱150 + Extra shot, twice; Regular ₱120 once.
    const shot = option.priceDelta;
    expect(cart.lines[0]?.lineTotal).toBe((15000 + shot) * 2);
    expect(cart.subtotal).toBe((15000 + shot) * 2 + 12000);
    expect(cart.count).toBe(3);
    expect(cart.hasUnavailable).toBe(false);
  });

  it('flags lines the shop removed or sold out, and leaves them out of the total', () => {
    const gone = line({ itemId: '44444444-4444-4444-8444-444444444444' });
    const soldOut = { ...latte, variants: [{ ...variant, isSoldOut: true }, regular] };
    const cart = priceCart([soldOut], [gone, line(), line({ variantId: regular.id, optionIds: [sugarId] })]);
    expect(cart.lines.map((priced) => priced.available)).toEqual([false, false, true]);
    expect(cart.lines[0]?.itemName).toBe('Removed item');
    expect(cart.subtotal).toBe(12000);
    expect(cart.count).toBe(1);
    expect(cart.hasUnavailable).toBe(true);
  });
});

describe('ordering block', () => {
  const now = new Date('2026-10-12T22:00:00+08:00');
  const hours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ tenantId: ids.tenant, weekday, opensAt: '07:00', closesAt: '21:00' }));
  const base = { isOpen: false, hours, closures: [], shop };

  it('is null while the database says open', () => {
    expect(orderingBlock({ ...base, isOpen: true }, now)).toBeNull();
  });

  it('says closed with the next opening', () => {
    expect(orderingBlock(base, now)).toEqual({ alert: "We're closed. Orders open 7:00 AM tomorrow.", short: 'Closed now' });
    expect(orderingBlock({ ...base, hours: [] }, now)?.alert).toBe("We're closed right now.");
  });

  it('says paused when orders are off or the shop is busy', () => {
    const paused = { ...base, shop: { ...shop, settings: { ...shop.settings, acceptingOrders: false } } };
    expect(orderingBlock(paused, now)?.short).toBe('Orders paused');
    const busy = { ...base, shop: { ...shop, settings: { ...shop.settings, busyUntil: '2026-10-12T22:30:00+08:00' } } };
    expect(orderingBlock(busy, now)?.short).toBe('Orders paused');
  });
});
