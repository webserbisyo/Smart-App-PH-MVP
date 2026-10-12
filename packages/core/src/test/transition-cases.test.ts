import { describe, expect, it } from 'vitest';

import pgtap from '../../../../supabase/tests/database/05_owner_orders.test.sql?raw';
import { nextActions } from '../order-rules';
import { TRANSITION_CASES } from './transition-cases';

const PLACED_AT = '2026-10-12T01:00:00Z';

/** The case names between the transition-cases markers of the pgTAP test, one row per line. */
function sqlCaseNames(sql: string): string[] {
  const body = /-- transition-cases:start\n([\s\S]*?)-- transition-cases:end/.exec(sql)?.[1];
  if (body === undefined) throw new Error('transition-cases markers not found in 05_owner_orders.test.sql');
  return body
    .split('\n')
    .filter((line) => line.startsWith("('"))
    .map((line) => (/^\('((?:[^']|'')*)'/.exec(line)?.[1] ?? '').replaceAll("''", "'"));
}

describe('transition cases', () => {
  it.each(TRANSITION_CASES)('$name', ({ order, settings, action, expected }) => {
    const offered = nextActions({ ...order, placedAt: PLACED_AT, pickupAt: null }, settings).includes(action);
    expect(offered).toBe(expected === 'ok');
  });

  it('cover every action, and both success and failure', () => {
    const actions = new Set(TRANSITION_CASES.map((transition) => transition.action));
    expect([...actions].sort()).toEqual(['complete', 'mark_paid', 'mark_ready', 'out_for_delivery', 'start', 'verify_payment']);
    expect(TRANSITION_CASES.some((transition) => transition.expected === 'ok')).toBe(true);
    expect(TRANSITION_CASES.some((transition) => transition.expected !== 'ok')).toBe(true);
  });

  it('the pgTAP test runs every case, in the same order', () => {
    expect(sqlCaseNames(pgtap)).toEqual(TRANSITION_CASES.map((transition) => transition.name));
  });
});
