import { describe, expect, it } from 'vitest';

import { Centavos, HexColor, IsoDateTime, ManilaDate, PhPhone, Slug, Uuid } from './primitives';

describe('Centavos', () => {
  it('accepts whole non-negative numbers', () => {
    expect(Centavos.safeParse(12000).success).toBe(true);
    expect(Centavos.safeParse(0).success).toBe(true);
  });
  it('rejects decimals', () => {
    expect(Centavos.safeParse(120.5).success).toBe(false);
  });
  it('rejects negatives', () => {
    expect(Centavos.safeParse(-1).success).toBe(false);
  });
});

describe('PhPhone', () => {
  it('accepts +639 and 9 digits', () => {
    expect(PhPhone.safeParse('+639171234567').success).toBe(true);
  });
  it('rejects the local 09 format', () => {
    expect(PhPhone.safeParse('09171234567').success).toBe(false);
  });
  it('rejects wrong lengths and spaces', () => {
    expect(PhPhone.safeParse('+63917123456').success).toBe(false);
    expect(PhPhone.safeParse('+639 171 234 567').success).toBe(false);
  });
});

describe('Slug', () => {
  it('accepts lowercase, digits and hyphens', () => {
    expect(Slug.safeParse('juans-cafe').success).toBe(true);
    expect(Slug.safeParse('tala-apparel-2').success).toBe(true);
  });
  it('rejects bad slugs', () => {
    for (const bad of ['ab', 'Juans-Cafe', 'juans_cafe', '-juan', 'juan-', 'juan--cafe', 'a'.repeat(41)]) {
      expect(Slug.safeParse(bad).success).toBe(false);
    }
  });
});

describe('other primitives', () => {
  it('Uuid', () => {
    expect(Uuid.safeParse('0b6f3b9e-8f5a-4c2e-9d1a-2f3e4a5b6c7d').success).toBe(true);
    expect(Uuid.safeParse('not-a-uuid').success).toBe(false);
  });
  it('IsoDateTime needs an offset', () => {
    expect(IsoDateTime.safeParse('2026-10-11T07:05:00+00:00').success).toBe(true);
    expect(IsoDateTime.safeParse('2026-10-11T07:05:00Z').success).toBe(true);
    expect(IsoDateTime.safeParse('2026-10-11 07:05').success).toBe(false);
  });
  it('ManilaDate is YYYY-MM-DD', () => {
    expect(ManilaDate.safeParse('2026-10-11').success).toBe(true);
    expect(ManilaDate.safeParse('10/11/2026').success).toBe(false);
  });
  it('HexColor is #RRGGBB', () => {
    expect(HexColor.safeParse('#1F4FD8').success).toBe(true);
    expect(HexColor.safeParse('blue').success).toBe(false);
  });
});
