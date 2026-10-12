import { describe, expect, it } from 'vitest';

import pgtap from '../../../../supabase/tests/database/03_storefront_read.test.sql?raw';
import { OPEN_CASES } from './open-cases';

/** The case names between the open-cases markers of the pgTAP test, one row per line. */
function sqlCaseNames(sql: string): string[] {
  const body = /-- open-cases:start\n([\s\S]*?)-- open-cases:end/.exec(sql)?.[1];
  if (body === undefined) throw new Error('open-cases markers not found in 03_storefront_read.test.sql');
  return body
    .split('\n')
    .filter((line) => line.startsWith("('"))
    .map((line) => (/^\('((?:[^']|'')*)'/.exec(line)?.[1] ?? '').replaceAll("''", "'"));
}

describe('open-hours cases', () => {
  it('the pgTAP test of private.is_open_now runs every core case, in the same order', () => {
    expect(sqlCaseNames(pgtap)).toEqual(OPEN_CASES.map((openCase) => openCase.name));
  });
});
