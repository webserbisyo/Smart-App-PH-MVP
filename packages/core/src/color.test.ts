import { describe, expect, it } from 'vitest';

import { contrastRatio, luminance, MIN_TEXT_CONTRAST, readableTextOn } from './color';

describe('luminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBe(1);
  });

  it('rejects anything that is not #RRGGBB', () => {
    expect(() => luminance('#fff')).toThrow();
    expect(() => luminance('red')).toThrow();
  });
});

describe('contrastRatio', () => {
  it('is 21 for black on white, either order', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });

  it('is 1 for the same colour', () => {
    expect(contrastRatio('#2456d3', '#2456d3')).toBeCloseTo(1, 5);
  });
});

describe('readableTextOn', () => {
  it('picks white on dark colours', () => {
    expect(readableTextOn('#000000')).toBe('#ffffff');
    expect(readableTextOn('#162241')).toBe('#ffffff');
    expect(readableTextOn('#7f4d28')).toBe('#ffffff');
  });

  it('picks black on light colours', () => {
    expect(readableTextOn('#ffffff')).toBe('#000000');
    expect(readableTextOn('#f9c635')).toBe('#000000');
    expect(readableTextOn('#b6e551')).toBe('#000000');
  });

  it('always passes 4.5:1 when one of black or white can', () => {
    for (const hex of ['#2456d3', '#c90f1a', '#0a7e3a', '#f5af20', '#777777', '#5bafde']) {
      expect(contrastRatio(hex, readableTextOn(hex))).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });
});
