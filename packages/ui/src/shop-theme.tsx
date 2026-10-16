import type { ReactNode } from 'react';

import { hoverOf, readableTextOn, softOf } from '@smartapp/core';

import { cn } from '#lib/utils';
import { cssVars } from '#lib/style';

export interface ShopThemeProps {
  /** 60 / 30 / 10 colours, `#RRGGBB`: background, cards and bars, buttons and highlights. */
  colors: { primary: string; secondary: string; accent: string };
  className?: string;
  /**
   * Also set the colours on the page root, so sheets and dialogs (rendered outside this wrapper) use them too.
   * The storefront shop layout only: one shop per page.
   */
  root?: boolean;
  children: ReactNode;
}

/**
 * Sets the shop's colours (`--shop-60`, `--shop-30`, `--shop-10` and their `-foreground` text colours) on a
 * wrapper; storefront screens use them through `bg-shop-10`, `text-shop-30-foreground` and so on. Shared
 * components keep the platform tokens, so a Button looks the same in both apps. Text colours are picked for
 * 4.5:1 contrast.
 */
export function ShopTheme({ colors, className, root = false, children }: ShopThemeProps) {
  const vars = {
    '--shop-60': colors.primary,
    '--shop-60-foreground': readableTextOn(colors.primary),
    '--shop-30': colors.secondary,
    '--shop-30-foreground': readableTextOn(colors.secondary),
    '--shop-10': colors.accent,
    '--shop-10-foreground': readableTextOn(colors.accent),
    '--shop-10-soft': softOf(colors.accent),
    '--shop-10-hover': hoverOf(colors.accent),
  };
  // Only #RRGGBB values reach here (HexColor in core), so the rule cannot carry anything else.
  const rootRule = `:root{${Object.entries(vars)
    .filter(([, value]) => /^#[0-9a-fA-F]{6}$/.test(value))
    .map(([name, value]) => `${name}:${value}`)
    .join(';')}}`;
  return (
    <div data-slot="shop-theme" style={cssVars(vars)} className={cn('min-h-dvh bg-shop-60 text-shop-60-foreground', className)}>
      {root && <style>{rootRule}</style>}
      {children}
    </div>
  );
}
