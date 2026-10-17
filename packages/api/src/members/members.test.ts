import { describe, expect, it } from 'vitest';

import { toApiError } from '../errors';

import { addressFromRow, stampRuleFromRow } from './members';
import type { AddressRow, StampRuleRow } from './members';

const tenantId = '1b8a4c2e-3d5f-4a6b-8c7d-9e0f1a2b3c4d';
const customerId = '2c9b5d3f-4e6a-4b7c-9d8e-0f1a2b3c4d5e';

describe('member rows', () => {
  it('map the stamp card row', () => {
    const row: StampRuleRow = {
      tenant_id: tenantId,
      is_active: true,
      min_order_total: 10000,
      stamps_needed: 8,
      reward_kind: 'discount',
      reward_label: '₱100 off your order',
      reward_amount: 10000,
      reward_item_id: null,
      reward_variant_id: null,
      reward_title: null,
      reward_description: null,
      reward_image_path: null,
      updated_at: '2026-10-12T08:00:00+00:00',
    };
    expect(stampRuleFromRow(row)).toEqual({
      tenantId,
      isActive: true,
      minOrderTotal: 10000,
      stampsNeeded: 8,
      rewardKind: 'discount',
      rewardLabel: '₱100 off your order',
      rewardAmount: 10000,
      rewardItemId: null,
      rewardVariantId: null,
      rewardTitle: null,
      rewardDescription: null,
      rewardImagePath: null,
    });
  });

  it('map a saved address row', () => {
    const row: AddressRow = {
      id: '3dac6e4a-5f7b-4c8d-8e9f-1a2b3c4d5e6f',
      tenant_id: tenantId,
      customer_id: customerId,
      label: 'Home',
      address_line: '12 Rizal St.',
      landmark: null,
      is_default: true,
      lat: null,
      lng: null,
      created_at: '2026-10-12T08:00:00+00:00',
    };
    expect(addressFromRow(row)).toEqual({
      id: row.id,
      tenantId,
      customerId,
      label: 'Home',
      addressLine: '12 Rizal St.',
      landmark: null,
      isDefault: true,
      lat: null,
      lng: null,
      pin: null,
    });
  });

  it('read the join errors from the database', () => {
    expect(toApiError({ message: 'phone_needs_order', code: 'P0001' }).code).toBe('phone_needs_order');
    expect(toApiError({ message: 'phone_in_use', code: 'P0001' }).code).toBe('phone_in_use');
    expect(toApiError({ message: 'reward_unavailable', code: 'P0001' }).code).toBe('reward_unavailable');
  });
});
