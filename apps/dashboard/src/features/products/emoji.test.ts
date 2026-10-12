import { describe, expect, it } from 'vitest';

import { lastEmoji } from './emoji';

describe('lastEmoji', () => {
  it('keeps one emoji, the last one typed, whole', () => {
    expect(lastEmoji('☕')).toBe('☕');
    expect(lastEmoji('☕🧋')).toBe('🧋');
    expect(lastEmoji('👩🏽‍🍳')).toBe('👩🏽‍🍳');
    expect(lastEmoji('🇵🇭')).toBe('🇵🇭');
  });

  it('ignores letters and numbers', () => {
    expect(lastEmoji('abc')).toBeNull();
    expect(lastEmoji('a🍞b')).toBe('🍞');
    expect(lastEmoji('')).toBeNull();
  });
});
