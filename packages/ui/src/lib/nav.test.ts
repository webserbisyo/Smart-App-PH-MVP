import { describe, expect, it } from 'vitest';

import { countText, initials } from './nav';

describe('countText', () => {
  it('caps at 99+', () => {
    expect(countText(5)).toBe('5');
    expect(countText(100)).toBe('99+');
  });
});

describe('initials', () => {
  it('takes the first and last word', () => {
    expect(initials('Juan dela Cruz')).toBe('JC');
    expect(initials('Kapihan')).toBe('KA');
    expect(initials('  ')).toBe('');
  });
});
