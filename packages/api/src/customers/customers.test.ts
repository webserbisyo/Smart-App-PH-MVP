import { describe, expect, it } from 'vitest';

import { toApiError } from '../errors';

import { customerRowFromRow, customerSearchFilter, likeContains } from './customers';
import type { CustomerTableRow } from './customers';

const row: CustomerTableRow = {
  id: '2c9b5d3f-4e6a-4b7c-9d8e-0f1a2b3c4d5e',
  tenant_id: '1b8a4c2e-3d5f-4a6b-8c7d-9e0f1a2b3c4d',
  user_id: null,
  name: 'Maria Peña',
  phone: '+639171234567',
  email: null,
  member_since: '2026-09-01T02:00:00+00:00',
  order_count: 12,
  total_spent: 234000,
  last_order_at: '2026-10-12T05:00:00+00:00',
  notes: 'Likes less ice',
  tags: ['suki'],
  created_at: '2026-08-01T02:00:00+00:00',
};

describe('customer rows', () => {
  it('map a customer with their stamp balance', () => {
    expect(customerRowFromRow({ ...row, customer_stamp_balances: [{ stamps: 7 }] })).toEqual({
      id: row.id,
      tenantId: row.tenant_id,
      userId: null,
      name: 'Maria Peña',
      phone: '+639171234567',
      email: null,
      memberSince: row.member_since,
      orderCount: 12,
      totalSpent: 234000,
      lastOrderAt: row.last_order_at,
      notes: 'Likes less ice',
      tags: ['suki'],
      stamps: 7,
    });
  });

  it('show 0 stamps for a customer with no stamp rows', () => {
    expect(customerRowFromRow({ ...row, customer_stamp_balances: [] }).stamps).toBe(0);
  });

  it('read a too-long note as invalid', () => {
    expect(toApiError({ message: 'violates check constraint "customers_notes_check"', code: '23514' }).code).toBe('invalid');
  });
});

describe('customer search', () => {
  it('is nothing when blank', () => {
    expect(customerSearchFilter('   ')).toBeNull();
    expect(customerSearchFilter('**')).toBeNull();
  });

  it('matches part of a name', () => {
    expect(customerSearchFilter(' Maria ')).toBe('name.ilike."*Maria*"');
  });

  it('matches a mobile number however it is typed', () => {
    const phone = 'phone.ilike."*9171234*"';
    expect(customerSearchFilter('09171234')).toBe(`name.ilike."*09171234*",${phone}`);
    expect(customerSearchFilter('+63 917-1234')).toBe(`name.ilike."*+63 917-1234*",${phone}`);
    expect(customerSearchFilter('9171234')).toBe(`name.ilike."*9171234*",${phone}`);
  });

  it('keeps LIKE wildcards, commas and quotes as plain text', () => {
    expect(likeContains('50%_off\\')).toBe('*50\\%\\_off\\\\*');
    expect(customerSearchFilter('a,b')).toBe('name.ilike."*a,b*"');
    expect(customerSearchFilter('say "hi"')).toBe('name.ilike."*say \\"hi\\"*"');
    expect(customerSearchFilter('100%')).toBe('name.ilike."*100\\\\%*"');
  });
});
