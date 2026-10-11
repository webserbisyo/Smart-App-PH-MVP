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
