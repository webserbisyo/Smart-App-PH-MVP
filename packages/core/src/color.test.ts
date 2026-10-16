import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  fromOklch,
  hoverOf,
  luminance,
  MIN_TEXT_CONTRAST,
  readableTextOn,
  shopPalette,
  softOf,
  THEME_PRESET_KEYS,
  THEME_PRESETS,
  themeContrastIssues,
  toOklch,
} from './color';

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

describe('themeContrastIssues', () => {
  it('passes every preset', () => {
    for (const key of THEME_PRESET_KEYS) expect(themeContrastIssues(THEME_PRESETS[key])).toEqual([]);
  });

  it('flags a light button on a light page and a mid-tone colour', () => {
    expect(themeContrastIssues({ primary: '#FFFFFF', secondary: '#F4F7FA', accent: '#FFE8A3' })).toEqual(['buttonsOnBackground']);
    expect(themeContrastIssues({ primary: '#FFFFFF', secondary: '#F4F7FA', accent: '#7A7A7A' })).toEqual(['buttonsOnBackground']);
    expect(themeContrastIssues({ primary: '#FFFFFF', secondary: '#F4F7FA', accent: '#2456D3' })).toEqual([]);
  });
});

describe('toOklch and fromOklch', () => {
  it('round-trips hex colors accurately', () => {
    for (const hex of ['#2456D3', '#000000', '#FFFFFF', '#6F4E37', '#6B3FA0', '#0B6E99', '#FFE066', '#111111']) {
      expect(fromOklch(toOklch(hex))).toBe(hex);
    }
  });

  it('extracts expected OKLCH coordinates', () => {
    const oklch = toOklch('#2456D3');
    expect(oklch.l).toBeCloseTo(0.5, 1);
    expect(oklch.c).toBeCloseTo(0.2, 1);
    expect(oklch.h).toBeCloseTo(264, 0);
  });
});

describe('shopPalette', () => {
  it('passes themeContrastIssues for all four presets', () => {
    for (const key of THEME_PRESET_KEYS) {
      const palette = shopPalette(THEME_PRESETS[key].accent);
      expect(themeContrastIssues(palette)).toEqual([]);
    }
  });

  it('passes themeContrastIssues for very light brand #FFE066 by darkening in OKLCH', () => {
    const palette = shopPalette('#FFE066');
    expect(themeContrastIssues(palette)).toEqual([]);
    expect(contrastRatio(palette.accent, '#ffffff')).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(contrastRatio(palette.accent, palette.primary)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
  });

  it('passes themeContrastIssues for very dark brand #111111', () => {
    const palette = shopPalette('#111111');
    expect(themeContrastIssues(palette)).toEqual([]);
    expect(palette.accent).toBe('#111111');
  });

  it('produces 60/30 background and card surfaces derived from brand hue', () => {
    const palette = shopPalette('#2456D3');
    expect(themeContrastIssues(palette)).toEqual([]);
    const oklchPrimary = toOklch(palette.primary);
    const oklchSecondary = toOklch(palette.secondary);
    expect(oklchPrimary.l).toBeCloseTo(0.975, 2);
    expect(oklchSecondary.l).toBeCloseTo(0.995, 2);
  });
});

describe('softOf and hoverOf', () => {
  it('softOf returns a light tint at L 0.93', () => {
    const soft = softOf('#2456D3');
    const oklch = toOklch(soft);
    expect(oklch.l).toBeCloseTo(0.93, 2);
  });

  it('hoverOf returns a darkened color at 0.06 L lower', () => {
    const original = toOklch('#2456D3');
    const hover = hoverOf('#2456D3');
    const oklchHover = toOklch(hover);
    expect(oklchHover.l).toBeCloseTo(original.l - 0.06, 2);
  });
});

