'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ComponentProps } from 'react';

import type { ShellNavItem } from '#lib/nav';
import { cn } from '#lib/utils';

export interface StoreTabBarProps {
  /** aria-label of the nav. */
  label: string;
  /** Home · Menu or Products · Orders · Account. */
  items: readonly ShellNavItem[];
  className?: string;
}

const tabClass = cn(
  'pressable group/tab flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 select-none',
  'text-xs font-medium text-shop-30-foreground/75 outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'data-active:font-bold data-active:text-shop-30-foreground',
);

function TabLink({ item, ...props }: { item: ShellNavItem } & Omit<ComponentProps<'a'>, 'children'>) {
  const icon = item.active && item.activeIcon !== undefined ? item.activeIcon : item.icon;
  return useRender({
    render: item.link,
    props: mergeProps<'a'>(
      {
        'aria-current': item.active ? 'page' : undefined,
        children: (
          <>
            <span
              aria-hidden="true"
              className="flex h-8 w-14 max-w-full items-center justify-center rounded-full transition-colors duration-fast group-data-active/tab:bg-shop-10 group-data-active/tab:text-shop-10-foreground [&>svg]:size-5"
            >
              {icon}
            </span>
            <span className="max-w-full truncate px-0.5">{item.label}</span>
          </>
        ),
      },
      props,
    ),
    state: { active: item.active },
  });
}

/** Storefront phone and tablet nav: a bar along the bottom in the shop's 30% colour, above the safe area. */
export function StoreTabBar({ label, items, className }: StoreTabBarProps) {
  return (
    <nav
      aria-label={label}
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 flex items-center gap-1 bg-shop-30 px-2 pb-safe text-shop-30-foreground shadow-lg',
        'keyboard-open:hidden',
        className,
      )}
    >
      {items.map((item) => (
        <TabLink key={item.key} item={item} className={tabClass} />
      ))}
    </nav>
  );
}
