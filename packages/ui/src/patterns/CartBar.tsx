import type { ComponentProps } from 'react';

import { IconChevronRight, IconShoppingBag } from '@tabler/icons-react';

import { cn } from '#lib/utils';

export interface CartBarProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** "Cart · 0 items ₱0" or formatted text. */
  text: string;
  total?: string;
}

/** The floating cart bar 56 px high, 8 px above the floating tab bar (phones and tablets), in shop-10. */
export function CartBar({ text, total, className, ...props }: CartBarProps) {
  return (
    <button
      type="button"
      className={cn(
        'pressable fixed inset-x-3 z-30 mx-auto flex h-14 w-[calc(100%-1.5rem)] max-w-110 items-center justify-between rounded-full px-5',
        'bottom-[calc(5.25rem+env(safe-area-inset-bottom))]',
        'bg-shop-10 text-left text-base font-semibold text-shop-10-foreground shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-shop-10-hover active:bg-shop-10/90',
        'keyboard-open:hidden',
        className,
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-2.5 truncate">
        <IconShoppingBag aria-hidden="true" className="size-5 shrink-0" />
        <span className="tabular truncate">{text}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1 font-bold">
        {total && <span className="tabular">{total}</span>}
        <IconChevronRight aria-hidden="true" className="size-4 opacity-80" />
      </div>
    </button>
  );
}

