import { describe, expect, it } from 'vitest';

import {
  allowedPaymentMethods,
  availableFulfillments,
  fulfillmentText,
  messengerLink,
  messengerShareLink,
  messengerOrderText,
  pickupSlots,
} from './checkout';
import { order, orderLine, paymentAccount, shopSettings } from './test/samples';

const everyDay = (opensAt: string, closesAt: string) =>
  [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt, closesAt }));

/** Juan's Cafe: 7:00 AM to 9:00 PM every day. */
const cafeHours = everyDay('07:00', '21:00');
/** Tala Apparel: 10:00 AM to 7:00 PM, Monday to Saturday (closed Sunday). */
const talaHours = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: '10:00', closesAt: '19:00' }));

/** A Manila wall-clock time as a Date. */
const manila = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`);

describe('pickupSlots', () => {
  it('starts at the quarter hour at least 20 minutes out and stops 15 minutes before closing', () => {
    // Monday 2026-10-12, 10:02 AM in Manila.
    const slots = pickupSlots(cafeHours, [], manila('2026-10-12', '10:02'));
    const today = slots.filter((slot) => slot.day === 'today');
    const tomorrow = slots.filter((slot) => slot.day === 'tomorrow');
    expect(today[0]).toEqual({ at: '2026-10-12T10:30:00+08:00', day: 'today', label: '10:30 AM' });
    expect(today.at(-1)?.label).toBe('8:45 PM');
    expect(today).toHaveLength(42);
    expect(tomorrow[0]).toEqual({ at: '2026-10-13T07:00:00+08:00', day: 'tomorrow', label: '7:00 AM' });
    expect(tomorrow.at(-1)?.at).toBe('2026-10-13T20:45:00+08:00');
    expect(tomorrow).toHaveLength(56);
  });

  it('every slot is at least 15 minutes after now, as the database requires', () => {
    const now = manila('2026-10-12', '10:14');
    const first = pickupSlots(cafeHours, [], now)[0];
    expect(first?.at).toBe('2026-10-12T10:45:00+08:00');
    for (const slot of pickupSlots(cafeHours, [], now)) {
      expect(new Date(slot.at).getTime() - now.getTime()).toBeGreaterThanOrEqual(15 * 60_000);
    }
  });

  it('skips a closed day', () => {
    const slots = pickupSlots(cafeHours, [{ closedOn: '2026-10-13' }], manila('2026-10-12', '10:02'));
    expect(slots.every((slot) => slot.day === 'today')).toBe(true);
    expect(pickupSlots(cafeHours, [{ closedOn: '2026-10-12' }], manila('2026-10-12', '10:02'))[0]?.day).toBe('tomorrow');
  });

  it('skips a day with no hours (Tala on Sunday)', () => {
    // Saturday 2026-10-17, 6:00 PM: 6:30 and 6:45 PM today, nothing on Sunday.
    const slots = pickupSlots(talaHours, [], manila('2026-10-17', '18:00'));
    expect(slots.map((slot) => slot.label)).toEqual(['6:30 PM', '6:45 PM']);
  });

  it('offers only tomorrow once today is past the cut-off', () => {
    const slots = pickupSlots(cafeHours, [], manila('2026-10-12', '20:30'));
    expect(slots[0]).toEqual({ at: '2026-10-13T07:00:00+08:00', day: 'tomorrow', label: '7:00 AM' });
  });

  it('follows overnight hours past midnight', () => {
    // 6:00 PM to 2:00 AM every day; Monday 11:00 PM.
    const slots = pickupSlots(everyDay('18:00', '02:00'), [], manila('2026-10-12', '23:00'));
    expect(slots[0]?.at).toBe('2026-10-12T23:30:00+08:00');
    const afterMidnight = slots.filter((slot) => slot.at.startsWith('2026-10-13T0'));
    expect(afterMidnight.map((slot) => slot.label)).toEqual(['12:00 AM', '12:15 AM', '12:30 AM', '12:45 AM', '1:00 AM', '1:15 AM', '1:30 AM', '1:45 AM']);
    expect(afterMidnight.every((slot) => slot.day === 'tomorrow')).toBe(true);
    expect(slots.at(-1)?.at).toBe('2026-10-13T23:45:00+08:00');
  });

  it('is empty for a shop with no hours', () => {
    expect(pickupSlots([], [], manila('2026-10-12', '10:00'))).toEqual([]);
  });
});

describe('availableFulfillments and allowedPaymentMethods', () => {
  const gcash = paymentAccount;
  const hiddenMaya = { ...paymentAccount, method: 'maya' as const, isActive: false };

  it('lists only the order types the shop has on', () => {
    expect(availableFulfillments(shopSettings)).toEqual(['walk_in', 'pickup', 'delivery']);
    expect(availableFulfillments({ ...shopSettings, walkInEnabled: false, deliveryEnabled: false })).toEqual(['pickup']);
  });

  it('shows cash, cash on delivery and transfers only where the shop allows them', () => {
    const settings = { codEnabled: false, payLaterPickup: false };
    expect(allowedPaymentMethods('walk_in', settings, [gcash, hiddenMaya])).toEqual(['cash', 'gcash']);
    expect(allowedPaymentMethods('pickup', settings, [gcash])).toEqual(['gcash']);
    expect(allowedPaymentMethods('pickup', { ...settings, payLaterPickup: true }, [gcash])).toEqual(['cash', 'gcash']);
    expect(allowedPaymentMethods('delivery', settings, [gcash])).toEqual(['gcash']);
    expect(allowedPaymentMethods('delivery', { ...settings, codEnabled: true }, [])).toEqual(['cod']);
  });
});

describe('messengerOrderText', () => {
  const now = new Date('2026-10-11T07:05:00+00:00');
  const ensaymada = { ...orderLine, itemName: 'Ensaymada', variantName: 'Regular', options: [], qty: 1, lineTotal: 4500 };

  it('writes the paper 6.6 message', () => {
    const text = messengerOrderText(order, [orderLine, ensaymada], 'https://shop.webserbisyo.com/juans-cafe/o/abc123def456', now);
    expect(text).toBe(
      [
        'Hi! Order #042 (Pickup 3:30 PM)',
        '2x Iced Latte (Large, Extra shot) - ₱360',
        '1x Ensaymada - ₱45',
        'Total: ₱360 · GCash (paid)',
        'Track: https://shop.webserbisyo.com/juans-cafe/o/abc123def456',
      ].join('\n'),
    );
  });

  it('adds the delivery fee and the payment state', () => {
    const delivery = {
      ...order,
      fulfillment: 'delivery' as const,
      pickupAt: null,
      deliveryFee: 5000,
      total: 41000,
      paymentStatus: 'pending' as const,
    };
    const lines = messengerOrderText(delivery, [orderLine], 'https://x.test/o/t', now).split('\n');
    expect(lines[0]).toBe('Hi! Order #042 (Delivery)');
    expect(lines[2]).toBe('Delivery fee - ₱50');
    expect(lines[3]).toBe('Total: ₱410 · GCash (proof uploaded)');
  });

  it('says pay on delivery for unpaid cash on delivery', () => {
    const cod = { ...order, fulfillment: 'delivery' as const, pickupAt: null, paymentMethod: 'cod' as const, paymentStatus: 'unpaid' as const };
    expect(messengerOrderText(cod, [orderLine], 'https://x.test/o/t', now)).toContain('Total: ₱360 · Cash on delivery (pay on delivery)');
  });

  it('says tomorrow for a pickup tomorrow', () => {
    expect(fulfillmentText({ fulfillment: 'pickup', pickupAt: '2026-10-12T01:00:00+00:00' }, now)).toBe('Pickup 9:00 AM tomorrow');
    expect(fulfillmentText({ fulfillment: 'walk_in', pickupAt: null }, now)).toBe('Walk-in');
  });

  it('builds an m.me link with the text filled in', () => {
    expect(messengerLink('juanscafe', 'Hi! Order #042\nTotal: ₱45')).toBe(
      'https://m.me/juanscafe?text=Hi!%20Order%20%23042%0ATotal%3A%20%E2%82%B145',
    );
  });
});

describe('messengerShareLink', () => {
  it('opens the Messenger app with the shop link', () => {
    expect(messengerShareLink('https://shop.webserbisyo.com/juans-cafe')).toBe('fb-messenger://share/?link=https%3A%2F%2Fshop.webserbisyo.com%2Fjuans-cafe');
  });
});
