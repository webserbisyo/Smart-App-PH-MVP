// Money is always a whole number of centavos (paper 7.1). Never floats.

export interface FormatPesoOptions {
  /** `auto` (default): whole pesos show no decimals (`₱1,250`), others show cents (`₱1,250.50`). `always`: slips. */
  cents?: 'auto' | 'always';
}

/** `12000` → `₱120`; `123450` → `₱1,234.50`; `{ cents: 'always' }` → `₱120.00`. */
export function formatPeso(amount: number, options: FormatPesoOptions = {}): string {
  const sign = amount < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(amount));
  const pesos = String(Math.trunc(absolute / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const rest = absolute % 100;
  if (rest === 0 && options.cents !== 'always') return `${sign}₱${pesos}`;
  return `${sign}₱${pesos}.${String(rest).padStart(2, '0')}`;
}

/**
 * What a person typed as a peso amount → centavos, or `null` when it isn't one.
 * Accepts `120`, `1,200`, `120.5`, `120.50`, `₱120`, `PHP 120`, ` 1 200 `. Never negative, at most 2 decimals.
 */
export function parsePesoInput(input: string): number | null {
  const compact = input.replace(/[₱\s]/g, '').replace(/^php/i, '');
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{0,2})?$/.test(compact) && !/^\.\d{1,2}$/.test(compact)) return null;
  const [whole = '', fraction = ''] = compact.replace(/,/g, '').split('.');
  const value = Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(value) ? value : null;
}

/** Centavos → the text a money input shows while editing (`123450` → `1234.50`, `12000` → `120`). */
export function pesoInputText(amount: number): string {
  const pesos = Math.trunc(amount / 100);
  const rest = Math.abs(amount % 100);
  return rest === 0 ? String(pesos) : `${String(pesos)}.${String(rest).padStart(2, '0')}`;
}

/** Centavos → pesos with two decimals and nothing else, for spreadsheets (`123450` → `1234.50`, `-500` → `-5.00`). */
export function pesoDecimal(amount: number): string {
  const absolute = Math.abs(Math.trunc(amount));
  const sign = amount < 0 && absolute > 0 ? '-' : '';
  return `${sign}${String(Math.trunc(absolute / 100))}.${String(absolute % 100).padStart(2, '0')}`;
}

/** Sum of centavo amounts. */
export function sumCentavos(amounts: readonly number[]): number {
  return amounts.reduce((total, amount) => total + amount, 0);
}
