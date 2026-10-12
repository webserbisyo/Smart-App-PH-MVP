import { describe, expect, it } from 'vitest';

import { API_ERROR_CODES, errorWords } from './errors';

describe('errorWords', () => {
  it('has words for every code', () => {
    for (const code of API_ERROR_CODES) {
      expect(errorWords(code).length).toBeGreaterThan(0);
    }
  });
});
