import { describe, expect, it } from 'vitest';

import type { DeliveryZone, ShopSettings } from '@smartapp/core';

import {
  closureChanges,
  dateFromKey,
  dateKey,
  emptyZone,
  facebookUrl,
  hoursFromData,
  HoursForm,
  InfoForm,
  infoPatch,
  messengerUsername,
  OrderTypesForm,
  orderTypesFromData,
  orderTypesPatch,
  paymentDraft,
  PaymentForm,
  paymentFromAccount,
  weekFromForm,
  zoneChanges,
} from './forms';

const TENANT = '00000000-0000-4000-8000-000000000001';
const ZONE_A = '00000000-0000-4000-8000-0000000000a1';
const ZONE_B = '00000000-0000-4000-8000-0000000000b1';

const settings: ShopSettings = {
  tenantId: TENANT,
  logoPath: null,
  coverPath: null,
  tagline: null,
  phone: null,
  email: null,
  address: null,
  city: null,
  mapsUrl: null,
  facebookUrl: null,
  messengerUsername: null,
  colorPrimary: '#FFFFFF',
  colorSecondary: '#F4F7FA',
  colorAccent: '#2456D3',
  acceptingOrders: true,
  busyUntil: null,
  walkInEnabled: true,
  pickupEnabled: true,
  deliveryEnabled: false,
  codEnabled: false,
  payLaterPickup: false,
  deliveryFeeViaMessenger: false,
  unpaidExpiryMinutes: 30,
  showMemberCount: true,
};

function zone(id: string, name: string, fee: number): DeliveryZone {
  return { id, tenantId: TENANT, name, fee, etaText: null, isActive: true, sort: 0 };
}

function paths(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }): string[] {
  return result.success ? [] : (result.error?.issues ?? []).map((issue) => issue.path.join('.'));
}

describe('business info', () => {
  it('accepts page and Messenger links typed any way', () => {
    expect(facebookUrl('facebook.com/juanscafe')).toBe('https://www.facebook.com/juanscafe');
    expect(facebookUrl('https://m.facebook.com/juanscafe')).toBe('https://www.facebook.com/juanscafe');
    expect(facebookUrl(' ')).toBeNull();
    expect(facebookUrl('juanscafe')).toBeUndefined();
    expect(messengerUsername('m.me/juans.cafe')).toBe('juans.cafe');
    expect(messengerUsername('https://m.me/juanscafe/')).toBe('juanscafe');
    expect(messengerUsername('juan cafe')).toBeUndefined();
  });

  it('checks the links and saves tidy values', () => {
    const form = { phone: '+639171234567', address: ' Mabini St. ', facebook: 'fb.com/juanscafe', messenger: 'juanscafe' };
    expect(paths(InfoForm.safeParse({ ...form, facebook: 'nope', messenger: 'a b' }))).toEqual(['facebook', 'messenger']);
    expect(infoPatch(form)).toEqual({ phone: '+639171234567', address: 'Mabini St.', facebookUrl: 'https://www.facebook.com/juanscafe', messengerUsername: 'juanscafe' });
  });
});

describe('hours', () => {
  it('shows seven days, off where nothing is saved, and saves only the open ones', () => {
    const form = hoursFromData([{ tenantId: TENANT, weekday: 1, opensAt: '07:00', closesAt: '21:00' }], [{ closedOn: '2026-10-20' }], { ...settings, acceptingOrders: false });
    expect(form.days.map((day) => day.open)).toEqual([false, true, false, false, false, false, false]);
    expect(form.days[0]).toEqual({ weekday: 0, open: false, opensAt: '08:00', closesAt: '20:00' });
    expect(form.paused).toBe(true);
    expect(weekFromForm(form)).toEqual([{ weekday: 1, opensAt: '07:00', closesAt: '21:00' }]);
  });

  it('refuses an open day that opens and closes at the same time; overnight is fine', () => {
    const form = hoursFromData([], [], settings);
    const days = form.days.map((day) => (day.weekday === 5 ? { ...day, open: true, opensAt: '18:00', closesAt: '18:00' } : day));
    expect(paths(HoursForm.safeParse({ ...form, days }))).toEqual(['days.5.closesAt']);
    const overnight = form.days.map((day) => (day.weekday === 5 ? { ...day, open: true, opensAt: '18:00', closesAt: '02:00' } : day));
    expect(paths(HoursForm.safeParse({ ...form, days: overnight }))).toEqual([]);
  });

  it('works out closed days to add and remove', () => {
    expect(closureChanges(['2026-10-20', '2026-10-25'], ['2026-10-25', '2026-11-01'])).toEqual({ add: ['2026-11-01'], remove: ['2026-10-20'] });
    expect(dateKey(dateFromKey('2026-01-05'))).toBe('2026-01-05');
  });
});

describe('order types and delivery areas', () => {
  it('keeps at least one order type and needs an area or the Messenger fee for delivery', () => {
    const form = orderTypesFromData(settings, []);
    expect(paths(OrderTypesForm.safeParse({ ...form, walkIn: false, pickup: false }))).toEqual(['walkIn']);
    expect(paths(OrderTypesForm.safeParse({ ...form, delivery: true }))).toEqual(['zones']);
    expect(paths(OrderTypesForm.safeParse({ ...form, delivery: true, viaMessenger: true }))).toEqual([]);
    expect(paths(OrderTypesForm.safeParse({ ...form, delivery: true, zones: [emptyZone()] }))).toEqual(['zones.0.name', 'zones.0.fee']);
  });

  it('turns pay-later off with its order type', () => {
    const form = { ...orderTypesFromData(settings, []), payLaterPickup: true, cod: true, pickup: false };
    expect(orderTypesPatch(form)).toMatchObject({ payLaterPickup: false, codEnabled: false, pickupEnabled: false });
  });

  it('saves new and changed areas and deletes removed ones', () => {
    const before = [zone(ZONE_A, 'Poblacion', 5_000), zone(ZONE_B, 'San Isidro', 8_000)];
    const form = orderTypesFromData(settings, before);
    const [first] = form.zones;
    if (!first) throw new Error('The form should list the saved areas.');
    const zones = [{ ...first, fee: 6_000 }, { ...emptyZone(), name: ' Mabini ', fee: 0 }];
    const changes = zoneChanges(before, zones);
    expect(changes.remove).toEqual([ZONE_B]);
    expect(changes.save.map((entry) => [entry.index, entry.draft.id, entry.draft.name, entry.draft.fee])).toEqual([
      [0, ZONE_A, 'Poblacion', 6_000],
      [1, null, 'Mabini', 0],
    ]);
    expect(zoneChanges(before, form.zones)).toEqual({ remove: [], save: [] });
  });
});

describe('payment accounts', () => {
  it('needs a name and number, and a bank name only for a bank', () => {
    const form = paymentFromAccount(null);
    expect(form.method).toBe('gcash');
    expect(paths(PaymentForm.safeParse(form))).toEqual(['accountName', 'accountNumber']);
    const filled = { ...form, accountName: 'Juan Dela Cruz', accountNumber: '09171234567' };
    expect(paths(PaymentForm.safeParse(filled))).toEqual([]);
    expect(paths(PaymentForm.safeParse({ ...filled, method: 'bank' }))).toEqual(['bankName']);
  });

  it('saves tidy values and drops the bank name for GCash', () => {
    const form = { method: 'gcash' as const, bankName: 'BPI', accountName: ' Juan ', accountNumber: ' 0917 ', qrPath: null, isActive: true };
    expect(paymentDraft(null, form)).toEqual({ id: null, method: 'gcash', bankName: null, accountName: 'Juan', accountNumber: '0917', qrPath: null, isActive: true });
    expect(paymentDraft(ZONE_A, { ...form, method: 'bank' }).bankName).toBe('BPI');
  });
});
