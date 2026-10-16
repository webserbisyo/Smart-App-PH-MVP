'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ComponentProps } from 'react';

import type { ShellNavItem } from '#lib/nav';
import { cn } from '#lib/utils';

export interface StoreTabBarProps {
  /** aria-label of the nav. */
  label: string;
  /** Home · Menu or Products · Rewards · Orders. */
  items: readonly ShellNavItem[];
  className?: string;
}

function TabLink({ item, ...props }: { item: ShellNavItem } & Omit<ComponentProps<'a'>, 'children'>) {
  const icon = item.active && item.activeIcon !== undefined ? item.activeIcon : item.icon;
  return useRender({
    render: item.link,
    props: mergeProps<'a'>(
      {
        'aria-current': item.active ? 'page' : undefined,
        children: (
          <>
            <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-5">
              {icon}
            </span>
            <span className="max-w-full truncate text-[11px] leading-tight">{item.label}</span>
          </>
        ),
      },
      props,
    ),
    state: { active: item.active },
  });
}

/**
 * Storefront phone & tablet nav: a floating pill dock (64 px high, 12 px from edges and safe area,
 * max 440 px wide, shop-30 at 90% with backdrop-blur; active tab is a shop-10-soft pill with filled icon).
 */
export function StoreTabBar({ label, items, className }: StoreTabBarProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex h-16 w-[calc(100%-1.5rem)] max-w-110 items-center justify-around gap-1 rounded-full bg-shop-30/90 p-1.5 shadow-lg backdrop-blur text-shop-30-foreground',
        'keyboard-open:hidden',
        className,
      )}
    >
      {items.map((item) => (
        <TabLink
          key={item.key}
          item={item}
          className={cn(
            'pressable group/tab flex h-full flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-2 py-1 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-fast',
            item.active ? 'bg-shop-10-soft font-bold text-shop-10' : 'font-medium text-shop-30-foreground/75 hover:text-shop-30-foreground',
          )}
        />
      ))}
    </nav>
  );
}

