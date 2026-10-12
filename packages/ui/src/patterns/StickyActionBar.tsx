import type { ComponentProps } from 'react';

import { useKeyboardInset } from '#hooks/use-keyboard-inset';
import { cn } from '#lib/utils';

/**
 * The bottom action area (item sheet, checkout, product editor, settings): stays at the bottom of its scroll area,
 * clears the iPhone home bar, and rides above the on-screen keyboard while typing.
 */
export function StickyActionBar({ className, style, children, ...props }: ComponentProps<'div'>) {
  const keyboard = useKeyboardInset();
  return (
    <div
      data-slot="sticky-action-bar"
      style={{ ...style, bottom: keyboard }}
      className={cn(
        'sticky z-20 -mx-4 mt-auto flex items-center gap-3 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] supports-backdrop-filter:backdrop-blur-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
