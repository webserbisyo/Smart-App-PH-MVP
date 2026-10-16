'use client';

import type { ReactNode } from 'react';

import { IconBell, IconUser } from '@tabler/icons-react';
import { cn } from '#lib/utils';

export interface StoreTopBarProps {
  name: string;
  logoUrl?: string | null | undefined;
  isOpen?: boolean | undefined;
  statusText?: string | undefined;
  accountHref: string;
  onOpenUpdates?: (() => void) | undefined;
  updateCount?: number | undefined;
  areaPill?: ReactNode | undefined;
  className?: string | undefined;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0]?.charAt(0) ?? '';
    const second = parts[1]?.charAt(0) ?? '';
    return (first + second).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Storefront phone & tablet top bar: 56 px high, shop logo, name, open state,
 * area pill, bell (updates sheet) and avatar (account link).
 */
export function StoreTopBar({
  name,
  logoUrl,
  isOpen = true,
  statusText,
  accountHref,
  onOpenUpdates,
  updateCount = 0,
  areaPill,
  className,
}: StoreTopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-14 w-full items-center justify-between gap-2 border-b border-shop-30-foreground/10 bg-shop-30/95 px-3 text-shop-30-foreground shadow-xs backdrop-blur lg:hidden',
        'pt-safe',
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="size-8 shrink-0 rounded-full object-cover border border-shop-30-foreground/15" />
        ) : (
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-shop-10 text-xs font-bold text-shop-10-foreground">
            {initialsOf(name)}
          </div>
        )}
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-bold">{name}</span>
          <span className="flex items-center gap-1 text-[11px] font-medium">
            <span
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                isOpen ? 'bg-success animate-pulse' : 'bg-muted-foreground',
              )}
            />
            <span className={isOpen ? 'text-success font-semibold' : 'text-muted-foreground'}>
              {statusText ?? (isOpen ? 'Open' : 'Closed')}
            </span>
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {areaPill}
        <button
          type="button"
          onClick={onOpenUpdates}
          aria-label={updateCount > 0 ? `Updates (${String(updateCount)})` : 'Updates'}
          className="relative pressable flex size-9 items-center justify-center rounded-full hover:bg-shop-10-soft text-shop-30-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconBell className="size-5" />
          {updateCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex size-2 rounded-full bg-destructive" />
          )}
        </button>
        <a
          href={accountHref}
          aria-label="Account"
          className="pressable flex size-9 items-center justify-center rounded-full hover:bg-shop-10-soft text-shop-30-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconUser className="size-5" />
        </a>
      </div>
    </header>
  );
}
