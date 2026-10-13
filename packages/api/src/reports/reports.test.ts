import { describe, expect, it } from 'vitest';

import { dbFunctions } from '@smartapp/core';

import { toApiError } from '../errors';

describe('report results', () => {
  it('parse what get_sales_report returns', () => {
    const data: unknown = {
      from: '2026-10-12',
      to: '2026-10-13',
      days: [
        { date: '2026-10-12', orders: 3, sales: 16000 },
        { date: '2026-10-13', orders: 0, sales: 0 },
      ],
      totals: { orders: 3, sales: 16000 },
      bestSellers: [{ itemName: 'Latte', qty: 5, sales: 25000 }],
    };
    expect(dbFunctions.get_sales_report.output.parse(data).days).toHaveLength(2);
  });

  it('refuse a range that ends before it starts before calling the database', () => {
    const input = { tenantId: '1b8a4c2e-3d5f-4a6b-8c7d-9e0f1a2b3c4d', from: '2026-10-13', to: '2026-10-12' };
    expect(dbFunctions.get_sales_report.input.safeParse(input).success).toBe(false);
  });

  it('read the report errors from the database', () => {
    expect(toApiError({ message: 'invalid', code: 'P0001' }).code).toBe('invalid');
    expect(toApiError({ message: 'not_allowed', code: 'P0001' }).code).toBe('not_allowed');
  });
});
