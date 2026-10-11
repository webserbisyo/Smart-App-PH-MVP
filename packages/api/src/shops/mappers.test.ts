import { describe, expect, it } from 'vitest';

import { tenantFromRow } from './mappers';
import type { TenantRow } from './mappers';

const row: TenantRow = {
  id: '0b6f3b9e-8f5a-4c2e-9d1a-2f3e4a5b6c7d',
  slug: 'juans-cafe',
  name: "Juan's Cafe",
  business_type: 'food',
  status: 'pending',
  plan: null,
  paid_until: null,
  is_demo: false,
  created_at: '2026-10-11T22:00:00.123456+00:00',
};

describe('tenantFromRow', () => {
  it('maps snake_case columns to the core Tenant', () => {
    expect(tenantFromRow(row)).toEqual({
      id: row.id,
      slug: 'juans-cafe',
      name: "Juan's Cafe",
      businessType: 'food',
      status: 'pending',
      plan: null,
      paidUntil: null,
      isDemo: false,
      createdAt: '2026-10-11T22:00:00.123456+00:00',
    });
  });

  it('maps an approved shop', () => {
    const tenant = tenantFromRow({ ...row, status: 'active', plan: 'early_599', paid_until: '2026-11-11' });
    expect(tenant.status).toBe('active');
    expect(tenant.paidUntil).toBe('2026-11-11');
  });

  it('refuses a row that breaks the contract', () => {
    expect(() => tenantFromRow({ ...row, business_type: 'cafe' })).toThrow();
  });
});
