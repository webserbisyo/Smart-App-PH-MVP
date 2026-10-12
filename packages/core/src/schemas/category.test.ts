import { describe, expect, it } from 'vitest';

import { category } from '../test/samples';

import { Category } from './category';

describe('category', () => {
  it('a valid Category parses', () => {
    expect(Category.parse(category)).toEqual(category);
  });
});

describe('category icon', () => {
  it('accepts a Fluent key, an emoji, a photo or none', () => {
    for (const icon of [{ kind: 'fluent', key: 'coffee' }, { kind: 'emoji', value: '🧋' }, { kind: 'image', path: 't/categories/a.webp' }, null]) {
      expect(Category.safeParse({ ...category, icon }).success).toBe(true);
    }
  });

  it('refuses a mixed icon', () => {
    expect(Category.safeParse({ ...category, icon: { kind: 'emoji', key: 'x' } }).success).toBe(false);
  });
});
