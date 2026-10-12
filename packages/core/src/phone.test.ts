import { describe, expect, it } from 'vitest';

import { PhPhone } from './schemas/primitives';
import { formatPhPhone, normalizePhPhone } from './phone';

describe('normalizePhPhone', () => {
  it.each([
    '09171234567',
    '0917 123 4567',
    '917 123 4567',
    '9171234567',
    '+63 917 123 4567',
    '+639171234567',
    '63-917-123-4567',
    '(0917) 123-4567',
  ])('reads %s', (input) => {
    const phone = normalizePhPhone(input);
    expect(phone).toBe('+639171234567');
    expect(PhPhone.safeParse(phone).success).toBe(true);
  });

  it.each(['', '12345', '0817 123 4567', '+1 917 123 4567', '0917 123 456', 'abc'])('refuses %s', (input) => {
    expect(normalizePhPhone(input)).toBeNull();
  });
});

describe('formatPhPhone', () => {
  it('shows the local format', () => {
    expect(formatPhPhone('+639171234567')).toBe('0917 123 4567');
  });

  it('leaves anything else alone', () => {
    expect(formatPhPhone('hello')).toBe('hello');
  });
});
