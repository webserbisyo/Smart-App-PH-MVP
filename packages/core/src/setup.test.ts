import { describe, expect, it } from 'vitest';

import { orderTypesReady, SETUP_STEPS, setupChecklist } from './setup';
import type { SetupInput } from './setup';
import { deliveryZone, paymentAccount, shopSettings } from './test/samples';

/** A shop just approved: default hours, walk-in and pickup on, nothing else. */
const NEW_SHOP: SetupInput = {
  settings: { ...shopSettings, logoPath: null, walkInEnabled: true, pickupEnabled: true, deliveryEnabled: false, codEnabled: false, payLaterPickup: false },
  hourCount: 7,
  accounts: [],
  itemCount: 0,
  zones: [],
};

const doneSteps = (input: SetupInput) => setupChecklist(input).steps.filter((entry) => entry.done).map((entry) => entry.step);

describe('setupChecklist', () => {
  it('lists the five steps in order', () => {
    expect(setupChecklist(NEW_SHOP).steps.map((entry) => entry.step)).toEqual([...SETUP_STEPS]);
    expect(SETUP_STEPS).toEqual(['logo', 'hours', 'payment', 'product', 'orderTypes']);
  });

  it('a new shop has only its default hours done', () => {
    expect(doneSteps(NEW_SHOP)).toEqual(['hours']);
    expect(setupChecklist(NEW_SHOP)).toMatchObject({ done: 1, total: 5, complete: false });
  });

  it('ticks each step as the owner finishes it, and is complete at 5 of 5', () => {
    const withLogo = { ...NEW_SHOP, settings: { ...NEW_SHOP.settings, logoPath: 'shop/logo.webp' } };
    expect(doneSteps(withLogo)).toEqual(['logo', 'hours']);
    const withProduct = { ...withLogo, itemCount: 1 };
    expect(doneSteps(withProduct)).toEqual(['logo', 'hours', 'product']);
    const withAccount = { ...withProduct, accounts: [paymentAccount] };
    expect(doneSteps(withAccount)).toEqual(['logo', 'hours', 'payment', 'product', 'orderTypes']);
    expect(setupChecklist(withAccount)).toMatchObject({ done: 5, complete: true });
  });

  it('hours are not done when every day was removed', () => {
    expect(doneSteps({ ...NEW_SHOP, hourCount: 0 })).toEqual([]);
  });

  it('an account that is turned off does not count', () => {
    expect(doneSteps({ ...NEW_SHOP, accounts: [{ ...paymentAccount, isActive: false }] })).not.toContain('payment');
  });
});

describe('orderTypesReady', () => {
  it('needs at least one order type on', () => {
    expect(orderTypesReady({ ...NEW_SHOP, settings: { ...NEW_SHOP.settings, walkInEnabled: false, pickupEnabled: false } })).toBe(false);
  });

  it('walk-in alone is ready (cash at the counter)', () => {
    expect(orderTypesReady({ ...NEW_SHOP, settings: { ...NEW_SHOP.settings, pickupEnabled: false } })).toBe(true);
  });

  it('pickup needs a way to pay: pay at pickup or an account', () => {
    expect(orderTypesReady(NEW_SHOP)).toBe(false);
    expect(orderTypesReady({ ...NEW_SHOP, settings: { ...NEW_SHOP.settings, payLaterPickup: true } })).toBe(true);
    expect(orderTypesReady({ ...NEW_SHOP, accounts: [paymentAccount] })).toBe(true);
  });

  it('delivery needs a way to pay and an active zone or the fee on Messenger', () => {
    const delivery = { ...NEW_SHOP, settings: { ...NEW_SHOP.settings, pickupEnabled: false, deliveryEnabled: true, codEnabled: true } };
    expect(orderTypesReady(delivery)).toBe(false);
    expect(orderTypesReady({ ...delivery, zones: [{ ...deliveryZone, isActive: false }] })).toBe(false);
    expect(orderTypesReady({ ...delivery, zones: [deliveryZone] })).toBe(true);
    expect(orderTypesReady({ ...delivery, settings: { ...delivery.settings, deliveryFeeViaMessenger: true } })).toBe(true);
    expect(orderTypesReady({ ...delivery, zones: [deliveryZone], settings: { ...delivery.settings, codEnabled: false } })).toBe(false);
  });
});
