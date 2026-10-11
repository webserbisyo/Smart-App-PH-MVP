import type { CSSProperties } from 'react';

declare module 'react' {
  interface CSSProperties {
    /** CSS custom properties (`--sidebar-width`), typed so no component needs a cast to set them. */
    [key: `--${string}`]: string | number | undefined;
  }
}

/** A typed style object of CSS custom properties: `style={cssVars({ '--sidebar-width': '16rem' })}`. */
export function cssVars(vars: Readonly<Record<`--${string}`, string | number | undefined>>, base: CSSProperties = {}): CSSProperties {
  return { ...base, ...vars };
}
