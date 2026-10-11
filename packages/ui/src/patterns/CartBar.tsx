import type { ComponentProps } from 'react';

import { IconShoppingBag } from '@tabler/icons-react';

import { cn } from '#lib/utils';

export interface CartBarProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** "Cart · 0 items ₱0". */
  text: string;
}

/** The floating cart bar above the storefront's tab bar (phones and tablets), in the shop's 10% colour. */
export function CartBar({ text, className, ...props }: CartBarProps) {
  return (
    <button
      type="button"
      className={cn(
        'pressable fixed inset-x-0 z-30 mx-auto flex h-12 w-[calc(100%-2rem)] max-w-(--dock-max-width) items-center gap-3 rounded-full px-5',
        'bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.75rem)]',
        'bg-shop-10 text-left text-base font-semibold text-shop-10-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'keyboard-open:hidden',
        className,
      )}
      {...props}
    >
      <IconShoppingBag aria-hidden="true" className="size-5 shrink-0" />
      <span className="tabular min-w-0 flex-1 truncate">{text}</span>
    </button>
  );
}
