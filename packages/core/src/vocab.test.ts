import { describe, expect, it } from 'vitest';

import { BUSINESS_TYPES } from './schemas/enums';
import { VOCAB } from './vocab';

describe('VOCAB', () => {
  it('has words for every business type', () => {
    for (const type of BUSINESS_TYPES) {
      expect(VOCAB[type].catalog.length).toBeGreaterThan(0);
    }
  });

  it('says Menu and Kitchen for food, Products and Packing for retail', () => {
    expect(VOCAB.food).toEqual({ catalog: 'Menu', item: 'Menu item', prep: 'Kitchen', schemaType: 'FoodEstablishment' });
    expect(VOCAB.retail).toEqual({ catalog: 'Products', item: 'Product', prep: 'Packing', schemaType: 'Store' });
  });
});
