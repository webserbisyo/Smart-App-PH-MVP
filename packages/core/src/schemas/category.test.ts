import { describe, expect, it } from 'vitest';

import { category } from '../test/samples';

import { Category } from './category';

describe('category', () => {
  it('a valid Category parses', () => {
    expect(Category.parse(category)).toEqual(category);
  });
});
