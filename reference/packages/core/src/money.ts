import { brand } from './brand';
import type { Brand } from './brand';

/** Money is always a whole number of centavos. Never floats. */
export type Centavos = Brand<number, 'Centavos'>;

export function centavos(value: number): Centavos {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`Centavos must be a whole number, got ${String(value)}`);
  }
  return brand<number, 'Centavos'>(value);
}

export interface FormatPesoOptions {
  /** `auto` (default): whole pesos show no decimals (`₱1,250`), others show cents (`₱1,250.50`). `always`: slips and receipts. */
  cents?: 'auto' | 'always';
}

/** `centavos(125000)` → `₱1,250`; `centavos(125050)` → `₱1,250.50`; `{ cents: 'always' }` → `₱1,250.00`. */
export function formatPeso(amount: Centavos, options: FormatPesoOptions = {}): string {
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(amount);
  const pesos = String(Math.trunc(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rest = absolute % 100;
  if (rest === 0 && options.cents !== 'always') return `${sign}₱${pesos}`;
  return `${sign}₱${pesos}.${String(rest).padStart(2, '0')}`;
}

/** A peso amount for a chart axis, where space is tight: `₱850`, `₱1.2k`, `₱12k`, `₱1.5M`. */
export function formatPesoShort(amount: Centavos): string {
  const sign = amount < 0 ? '-' : '';
  const pesos = Math.abs(amount) / 100;
  const short = (value: number, unit: string) => `${sign}₱${value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10)}${unit}`;
  if (pesos >= 1_000_000) return short(pesos / 1_000_000, 'M');
  if (pesos >= 1_000) return short(pesos / 1_000, 'k');
  return `${sign}₱${String(Math.round(pesos))}`;
}

/**
 * What a person typed as a peso amount → centavos, or `null` when it isn't one.
 * Accepts `1250`, `1,250`, `1250.5`, `1,250.50`, `₱1,250.50`, ` 1 250 `. Never negative, at most 2 decimals.
 */
export function parsePesoInput(input: string): Centavos | null {
  const compact = input.replace(/[₱\s]/g, '').replace(/^php/i, '');
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{0,2})?$/.test(compact) && !/^\.\d{1,2}$/.test(compact)) return null;
  const [whole = '', fraction = ''] = compact.replace(/,/g, '').split('.');
  const value = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(value) ? centavos(value) : null;
}

/** Centavos → the text a money input shows when editing (`125050` → `1250.50`, `125000` → `1250`). */
export function pesoInputText(amount: Centavos): string {
  const pesos = Math.trunc(amount / 100);
  const rest = Math.abs(amount % 100);
  return rest === 0 ? String(pesos) : `${String(pesos)}.${String(rest).padStart(2, '0')}`;
}

/** Sum of amounts as centavos. */
export function sumCentavos(amounts: readonly number[]): Centavos {
  return centavos(amounts.reduce((total, amount) => total + amount, 0));
}
