import { describe, expect, it } from 'vitest';

import { item, itemPhoto } from '../test/samples';

import { Item, ItemPhoto } from './item';

describe('item', () => {
  it('a valid Item parses', () => {
    expect(Item.parse(item)).toEqual(item);
  });
  it('a valid ItemPhoto parses', () => {
    expect(ItemPhoto.parse(itemPhoto)).toEqual(itemPhoto);
  });
});
