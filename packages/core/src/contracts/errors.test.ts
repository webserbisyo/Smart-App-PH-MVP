import { describe, expect, it } from 'vitest';

import { VOCAB } from '../vocab';

import { API_ERROR_CODES, errorWords } from './errors';

describe('errorWords', () => {
  it('has words for every code', () => {
    for (const code of API_ERROR_CODES) {
      expect(errorWords(code).length).toBeGreaterThan(0);
      expect(errorWords(code, VOCAB.retail).length).toBeGreaterThan(0);
    }
  });

  it('names the thing for sale in the shop vocab', () => {
    expect(errorWords('item_has_orders', VOCAB.food)).toBe('This menu item has orders, so it cannot be deleted. Archive it instead.');
    expect(errorWords('reward_item_in_use', VOCAB.food)).toBe('This menu item is your stamp reward. Change the reward first.');
    expect(errorWords('category_not_empty', VOCAB.retail)).toBe('Move or remove every product in this category first.');
    expect(errorWords('not_allowed', VOCAB.food)).toBe(errorWords('not_allowed'));
  });
});
