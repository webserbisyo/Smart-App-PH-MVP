import { describe, expect, it } from 'vitest';

import { formatPeso, parsePesoInput, pesoInputText, sumCentavos } from './money';

describe('formatPeso', () => {
  it('drops .00 for whole pesos', () => {
    expect(formatPeso(12000)).toBe('₱120');
    expect(formatPeso(0)).toBe('₱0');
  });

  it('shows cents and thousands separators', () => {
    expect(formatPeso(123450)).toBe('₱1,234.50');
    expect(formatPeso(1234500)).toBe('₱12,345');
    expect(formatPeso(105)).toBe('₱1.05');
  });

  it('shows cents always when asked', () => {
    expect(formatPeso(12000, { cents: 'always' })).toBe('₱120.00');
  });

  it('puts the sign before the peso sign', () => {
    expect(formatPeso(-5000)).toBe('-₱50');
  });
});

describe('parsePesoInput', () => {
  it.each([
    ['120', 12000],
    ['₱120', 12000],
    ['120.50', 12050],
    ['120.5', 12050],
    ['1,200', 120000],
    [' 1 200 ', 120000],
    ['PHP 99', 9900],
    ['.5', 50],
  ])('reads %s', (input, expected) => {
    expect(parsePesoInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1.234', '12,34', '1,2345'])('refuses %s', (input) => {
    expect(parsePesoInput(input)).toBeNull();
  });
});

describe('pesoInputText and sumCentavos', () => {
  it('round-trips with parsePesoInput', () => {
    expect(pesoInputText(123450)).toBe('1234.50');
    expect(pesoInputText(12000)).toBe('120');
    expect(parsePesoInput(pesoInputText(123405))).toBe(123405);
  });

  it('sums', () => {
    expect(sumCentavos([12000, 3450, 0])).toBe(15450);
    expect(sumCentavos([])).toBe(0);
  });
});
