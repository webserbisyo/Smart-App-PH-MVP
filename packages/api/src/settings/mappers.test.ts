import { describe, expect, it } from 'vitest';

import {
  businessHoursFromRow,
  businessHoursToRow,
  paymentAccountFromRow,
  paymentAccountToRow,
  shopSettingsFromRow,
  shopSettingsToUpdate,
} from './mappers';
import type { PaymentAccountRow, ShopSettingsRow } from './mappers';

const tenantId = '0b6f3b9e-8f5a-4c2e-9d1a-2f3e4a5b6c7d';

const settingsRow: ShopSettingsRow = {
  tenant_id: tenantId,
  logo_path: null,
  cover_path: null,
  tagline: 'Coffee and pastries',
  phone: null,
  email: null,
  address: null,
  city: null,
  maps_url: null,
  facebook_url: null,
  messenger_username: 'juanscafe',
  color_primary: '#FFFFFF',
  color_secondary: '#F4F7FA',
  color_accent: '#2456D3',
  accepting_orders: true,
  busy_until: null,
  walk_in_enabled: true,
  pickup_enabled: true,
  delivery_enabled: false,
  cod_enabled: false,
  pay_later_pickup: false,
  delivery_fee_via_messenger: false,
  unpaid_expiry_minutes: 30,
  show_member_count: true,
  announcement_text: null,
  announcement_tone: 'info',
  announcement_ends_at: null,
  about_text: null,
  google_review_url: null,
  shop_lat: null,
  shop_lng: null,
};

describe('shop settings mappers', () => {
  it('maps a row to ShopSettings', () => {
    const settings = shopSettingsFromRow(settingsRow);
    expect(settings.tenantId).toBe(tenantId);
    expect(settings.messengerUsername).toBe('juanscafe');
    expect(settings.unpaidExpiryMinutes).toBe(30);
  });

  it('sends only the fields that changed, never the shop id', () => {
    expect(shopSettingsToUpdate({ tagline: null, codEnabled: true })).toEqual({ tagline: null, cod_enabled: true });
    expect(shopSettingsToUpdate({})).toEqual({});
  });
});

describe('business hours mappers', () => {
  it('drops the seconds Postgres adds', () => {
    const hours = businessHoursFromRow({ tenant_id: tenantId, weekday: 1, opens_at: '08:00:00', closes_at: '20:00:00' });
    expect(hours).toEqual({ tenantId, weekday: 1, opensAt: '08:00', closesAt: '20:00' });
  });

  it('writes a day for the shop', () => {
    expect(businessHoursToRow(tenantId, { weekday: 5, opensAt: '18:00', closesAt: '02:00' })).toEqual({
      tenant_id: tenantId,
      weekday: 5,
      opens_at: '18:00',
      closes_at: '02:00',
    });
  });
});

describe('payment account mappers', () => {
  const row: PaymentAccountRow = {
    id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    tenant_id: tenantId,
    method: 'gcash',
    account_name: 'Ana Cruz',
    account_number: '09171234567',
    bank_name: null,
    qr_path: `${tenantId}/qr/a.webp`,
    is_active: true,
    sort: 0,
    created_at: '2026-10-12T01:00:00+00:00',
  };

  it('maps a row', () => {
    expect(paymentAccountFromRow(row)).toMatchObject({ method: 'gcash', accountName: 'Ana Cruz', qrPath: row.qr_path });
  });

  it('refuses a method the checkout does not take', () => {
    expect(() => paymentAccountFromRow({ ...row, method: 'cash' })).toThrow();
  });

  it('leaves the id out for a new account', () => {
    const draft = { id: null, method: 'maya' as const, accountName: 'Ana', accountNumber: '0917', bankName: null, qrPath: null, isActive: true };
    expect(paymentAccountToRow(tenantId, draft)).not.toHaveProperty('id');
  });
});
