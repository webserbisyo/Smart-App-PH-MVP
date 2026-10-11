import { describe, expect, it } from 'vitest';

import migration from '../../../../supabase/migrations/20261011230000_shops_and_owners.sql?raw';
import { RESERVED_SLUGS, Slug } from './primitives';

/** The words inside `private.is_reserved_slug`'s `array[...]`. */
function sqlReservedSlugs(sql: string): string[] {
  const body = /function private\.is_reserved_slug[\s\S]*?array\[([\s\S]*?)\]/.exec(sql)?.[1];
  if (body === undefined) throw new Error('private.is_reserved_slug not found in the migration');
  return [...body.matchAll(/'([^']*)'/g)].map((match) => match[1] ?? '');
}

describe('reserved slugs', () => {
  it('core and the database reserve exactly the same words', () => {
    expect(sqlReservedSlugs(migration).toSorted()).toEqual([...RESERVED_SLUGS].toSorted());
  });

  it('Slug refuses every reserved word', () => {
    for (const word of RESERVED_SLUGS) {
      expect(Slug.safeParse(word).success).toBe(false);
    }
    expect(Slug.safeParse('juans-cafe').success).toBe(true);
  });
});
