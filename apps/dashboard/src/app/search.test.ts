import { describe, expect, it } from 'vitest';

import { moduleSearch } from './search';

describe('moduleSearch', () => {
  it('keeps the list filters and drops everything else', () => {
    expect(moduleSearch({ show: 'to_verify', stock: 'low', other: 'x' })).toEqual({ show: 'to_verify', stock: 'low' });
    expect(moduleSearch({ show: 3 })).toEqual({});
    expect(moduleSearch({})).toEqual({});
  });
});
