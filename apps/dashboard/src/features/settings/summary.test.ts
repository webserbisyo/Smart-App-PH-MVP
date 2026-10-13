import { describe, expect, it } from 'vitest';

import { THEME_PRESETS } from '@smartapp/core';
import type { PaymentAccount, ShopSettings } from '@smartapp/core';

import { hoursSummary, infoSummary, lookSummary, matchingPreset, orderTypesSummary, paymentsSummary, stampsSummary } from './summary';

const TENANT = '00000000-0000-4000-8000-000000000001';
const settings: ShopSettings = {
  tenantId: TENANT, logoPath: null, coverPath: null, tagline: null, phone: null, email: null, address: null, city: null, mapsUrl: null,
  facebookUrl: null, messengerUsername: null, colorPrimary: '#FFFFFF', colorSecondary: '#F4F7FA', colorAccent: '#2456D3', acceptingOrders: true,
  busyUntil: null, walkInEnabled: true, pickupEnabled: true, deliveryEnabled: false, codEnabled: false, payLaterPickup: false,
  deliveryFeeViaMessenger: false, unpaidExpiryMinutes: 30, showMemberCount: true,
};
// Monday 2026-10-12, 10:00 in Manila.
const MONDAY = new Date('2026-10-12T02:00:00Z');

function account(method: PaymentAccount['method'], isActive = true): PaymentAccount {
  return { id: crypto.randomUUID(), tenantId: TENANT, method, accountName: 'Juan', accountNumber: '0917', bankName: null, qrPath: null, isActive, sort: 0 };
}

describe('settings summaries', () => {
  it('names the preset, or says custom colours', () => {
    expect(matchingPreset({ ...THEME_PRESETS.kape, accent: THEME_PRESETS.kape.accent.toLowerCase() })).toBe('kape');
    const k = THEME_PRESETS.kape;
    expect(lookSummary("Juan's Cafe", { ...settings, colorPrimary: k.primary, colorSecondary: k.secondary, colorAccent: k.accent })).toBe("Juan's Cafe · Kape");
    expect(lookSummary("Juan's Cafe", settings)).toBe("Juan's Cafe · Your colours");
  });

  it('shows the phone, the address or a nudge', () => {
    expect(infoSummary({ ...settings, phone: '+639171234567' })).toBe('0917 123 4567');
    expect(infoSummary({ ...settings, address: 'Mabini St.' })).toBe('Mabini St.');
    expect(infoSummary(settings)).toBe('Add your contact number and address');
  });

  it("says today's hours, closed, paused or none in Manila time", () => {
    const monday = [{ tenantId: TENANT, weekday: 1, opensAt: '07:00', closesAt: '21:00' }];
    expect(hoursSummary(settings, monday, [], MONDAY)).toBe('Open today 7:00 AM to 9:00 PM');
    expect(hoursSummary(settings, monday, [{ closedOn: '2026-10-12' }], MONDAY)).toBe('Closed today');
    expect(hoursSummary(settings, [{ tenantId: TENANT, weekday: 2, opensAt: '07:00', closesAt: '21:00' }], [], MONDAY)).toBe('Closed today');
    expect(hoursSummary(settings, [], [], MONDAY)).toBe('No hours yet: the shop shows Closed');
    expect(hoursSummary({ ...settings, acceptingOrders: false }, monday, [], MONDAY)).toBe('Orders paused');
  });

  it('lists order types and active payment methods', () => {
    expect(orderTypesSummary({ ...settings, deliveryEnabled: true })).toBe('Walk-in, Pickup, Delivery');
    expect(paymentsSummary([account('gcash'), account('gcash'), account('maya'), account('bank', false)])).toBe('GCash, Maya');
    expect(paymentsSummary([])).toBe('No accounts yet');
  });
});

describe('stamp card summary', () => {
  const rule = { tenantId: '00000000-0000-4000-8000-000000000001', isActive: true, minOrderTotal: 0, stampsNeeded: 10, rewardLabel: '₱100 off your order', rewardAmount: 10000 };
  it('says Off, or the stamps and the reward', () => {
    expect(stampsSummary(rule)).toBe('10 stamps for ₱100 off your order');
    expect(stampsSummary({ ...rule, isActive: false })).toBe('Off');
  });
});
