// Colour helpers for shop themes. WCAG 2.x relative luminance and contrast ratio.

/** Black or white, as `#RRGGBB`. */
export type TextColor = '#000000' | '#ffffff';

/** The minimum contrast for normal text (WCAG AA). */
export const MIN_TEXT_CONTRAST = 4.5;

function channel(hex: string, start: number): number {
  const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance of a `#RRGGBB` colour, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`Not a #RRGGBB colour: ${hex}`);
  }
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** Contrast ratio between two `#RRGGBB` colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

/**
 * Text colour for a shop colour: white if it passes 4.5:1, else black if that passes, else whichever
 * contrasts more (mid-tones where neither passes are rare; the theme editor will warn about them later).
 */
export function readableTextOn(hex: string): TextColor {
  const onWhite = contrastRatio(hex, '#ffffff');
  const onBlack = contrastRatio(hex, '#000000');
  if (onWhite >= MIN_TEXT_CONTRAST) return '#ffffff';
  if (onBlack >= MIN_TEXT_CONTRAST) return '#000000';
  return onWhite >= onBlack ? '#ffffff' : '#000000';
}

/** A shop's three colours: 60 background, 30 cards and bars, 10 buttons and highlights (`#RRGGBB`). */
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

export const THEME_PRESET_KEYS = ['uling', 'kape', 'ube', 'dagat'] as const;
export type ThemePresetKey = (typeof THEME_PRESET_KEYS)[number];

/** Ready-made colour sets for Shop look (ux-plan 5.13); each passes `themeContrastIssues`. */
export const THEME_PRESETS: Readonly<Record<ThemePresetKey, ThemeColors>> = {
  uling: { primary: '#1F1F1F', secondary: '#2C2C2C', accent: '#F5A524' },
  kape: { primary: '#FBF6F0', secondary: '#EFE3D3', accent: '#6F4E37' },
  ube: { primary: '#FAF7FD', secondary: '#EDE5F7', accent: '#6B3FA0' },
  dagat: { primary: '#F3F9FC', secondary: '#DDEFF7', accent: '#0B6E99' },
};

/** Which part of a theme is hard to read. */
export type ContrastIssue = 'background' | 'cards' | 'buttons' | 'buttonsOnBackground';

/**
 * The places where a theme falls below 4.5:1: text on each colour (black or white, whichever reads better) and the
 * buttons against the background (a light button on a light page disappears).
 */
export function themeContrastIssues(colors: ThemeColors): ContrastIssue[] {
  const issues: ContrastIssue[] = [];
  const textPasses = (hex: string) => contrastRatio(hex, readableTextOn(hex)) >= MIN_TEXT_CONTRAST;
  if (!textPasses(colors.primary)) issues.push('background');
  if (!textPasses(colors.secondary)) issues.push('cards');
  if (!textPasses(colors.accent)) issues.push('buttons');
  if (contrastRatio(colors.accent, colors.primary) < MIN_TEXT_CONTRAST) issues.push('buttonsOnBackground');
  return issues;
}

export interface OklchColor {
  /** Lightness: 0 (black) to 1 (white). */
  l: number;
  /** Chroma: saturation distance from neutral axis (>= 0). */
  c: number;
  /** Hue: angle in degrees [0, 360). */
  h: number;
}

function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055;
}

function linearRgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bOklab = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  return [L, a, bOklab];
}

function oklabToLinearRgb(L: number, a: number, bOklab: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * bOklab;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * bOklab;
  const s_ = L - 0.0894841775 * a - 1.291485548 * bOklab;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return [r, g, b];
}

function hexToRgb(hex: string): [number, number, number] {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(`Not a #RRGGBB colour: ${hex}`);
  }
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

/** Converts a `#RRGGBB` hex string to OKLCH. */
export function toOklch(hex: string): OklchColor {
  const [r, g, b] = hexToRgb(hex);
  const [L, a, bOklab] = linearRgbToOklab(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
  const c = Math.sqrt(a * a + bOklab * bOklab);
  let h = (Math.atan2(bOklab, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  if (c < 1e-6) h = 0;
  return { l: L, c, h };
}

/**
 * Converts an OKLCH color to a `#RRGGBB` hex string.
 * Applies CSS Color 4 chroma reduction gamut mapping if coordinates fall outside sRGB.
 */
export function fromOklch(oklch: OklchColor): string {
  const l = Math.max(0, Math.min(1, oklch.l));
  const rad = (oklch.h * Math.PI) / 180;
  let a = oklch.c * Math.cos(rad);
  let bOklab = oklch.c * Math.sin(rad);
  let [rLin, gLin, bLin] = oklabToLinearRgb(l, a, bOklab);

  const outOfGamut = rLin < 0 || rLin > 1 || gLin < 0 || gLin > 1 || bLin < 0 || bLin > 1;
  if (outOfGamut) {
    let low = 0;
    let high = oklch.c;
    for (let i = 0; i < 20; i += 1) {
      const mid = (low + high) / 2;
      const testA = mid * Math.cos(rad);
      const testB = mid * Math.sin(rad);
      const [tr, tg, tb] = oklabToLinearRgb(l, testA, testB);
      if (tr >= -1e-4 && tr <= 1 + 1e-4 && tg >= -1e-4 && tg <= 1 + 1e-4 && tb >= -1e-4 && tb <= 1 + 1e-4) {
        low = mid;
      } else {
        high = mid;
      }
    }
    a = low * Math.cos(rad);
    bOklab = low * Math.sin(rad);
    [rLin, gLin, bLin] = oklabToLinearRgb(l, a, bOklab);
  }

  const r = Math.min(255, Math.max(0, Math.round(linearToSrgb(rLin) * 255)));
  const g = Math.min(255, Math.max(0, Math.round(linearToSrgb(gLin) * 255)));
  const b = Math.min(255, Math.max(0, Math.round(linearToSrgb(bLin) * 255)));
  const hex = [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `#${hex.toUpperCase()}`;
}

/**
 * Builds the 60/30/10 shop palette from a single brand color (docs/storefront-v2.md section 2).
 * 60% background: brand hue at OKLCH L 0.975, C 0.012.
 * 30% cards/sheets: brand hue at OKLCH L 0.995, C 0.004.
 * 10% buttons/highlights: brand color, darkened in OKLCH until white text and background contrast pass 4.5:1.
 */
export function shopPalette(brandHex: string): ThemeColors {
  const oklch = toOklch(brandHex);
  const primary = fromOklch({ l: 0.975, c: 0.012, h: oklch.h });
  const secondary = fromOklch({ l: 0.995, c: 0.004, h: oklch.h });

  let accent = brandHex.toUpperCase();
  let l = oklch.l;
  while (l > 0.01 && (contrastRatio(accent, '#ffffff') < MIN_TEXT_CONTRAST || contrastRatio(accent, primary) < MIN_TEXT_CONTRAST)) {
    l -= 0.005;
    accent = fromOklch({ l, c: oklch.c, h: oklch.h });
  }

  return { primary, secondary, accent };
}

/** Soft fill for selected chips and subtle badges: 10% accent color at OKLCH L 0.93. */
export function softOf(hex: string): string {
  const oklch = toOklch(hex);
  return fromOklch({ l: 0.93, c: Math.min(oklch.c, 0.04), h: oklch.h });
}

/** Hover fill for buttons and pressable surfaces: 10% accent color darkened by 0.06 L. */
export function hoverOf(hex: string): string {
  const oklch = toOklch(hex);
  return fromOklch({ l: Math.max(0, oklch.l - 0.06), c: oklch.c, h: oklch.h });
}

