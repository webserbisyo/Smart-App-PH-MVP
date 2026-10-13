import { describe, expect, it } from 'vitest';

import { orderCsvRow, orderLineText, ordersCsv } from './reports';
import { order, orderLine } from './test/samples';
import { WORDS } from './words';

describe('orderLineText', () => {
  it('shows quantity, item, variant and choices', () => {
    expect(orderLineText(orderLine)).toBe('2x Iced Latte, Large (Extra shot)');
  });

  it('leaves out the default variant and empty choices', () => {
    expect(orderLineText({ ...orderLine, variantName: 'Regular', options: [], qty: 1, itemName: 'Ensaymada' })).toBe('1x Ensaymada');
  });
});

describe('orderCsvRow', () => {
  it('has one cell per header, in Manila time and pesos', () => {
    const row = orderCsvRow({ order: { ...order, placedAt: '2026-10-11T15:30:00+00:00', discountTotal: 5000, total: 31000 }, lines: [orderLine] });
    expect(row).toHaveLength(WORDS.dashboard.reports.csv.headers.length);
    expect(row).toEqual([
      '#042',
      '2026-10-11',
      '23:30',
      'Pickup',
      'Maria Santos',
      '2x Iced Latte, Large (Extra shot)',
      '360.00',
      '50.00',
      '0.00',
      '310.00',
      'GCash',
      'Paid',
      'Preparing',
    ]);
  });

  it('puts an order at 00:30 Manila on its Manila date', () => {
    const row = orderCsvRow({ order: { ...order, placedAt: '2026-10-11T16:30:00+00:00' }, lines: [] });
    expect(row.slice(1, 3)).toEqual(['2026-10-12', '00:30']);
  });
});

describe('ordersCsv', () => {
  it('starts with the header row and quotes the items', () => {
    const csv = ordersCsv([{ order, lines: [orderLine, { ...orderLine, itemName: 'Ensaymada', variantName: 'Regular', options: [], qty: 1 }] }]);
    const [header, first] = csv.split('\r\n');
    expect(header).toBe(WORDS.dashboard.reports.csv.headers.join(','));
    expect(first).toContain('"2x Iced Latte, Large (Extra shot); 1x Ensaymada"');
  });
});
