import type { ComponentProps } from 'react';

import { useKeyboardInset } from '#hooks/use-keyboard-inset';
import { cn } from '#lib/utils';

/**
 * The bottom action area (item sheet, checkout, product editor, settings): stays at the bottom of its scroll area,
 * clears the iPhone home bar, and rides above the on-screen keyboard while typing. `aboveDock` keeps it above the
 * phone's floating bottom dock (the dock hides while the keyboard is open).
 */
export function StickyActionBar({ className, style, children, aboveDock = false, ...props }: ComponentProps<'div'> & { aboveDock?: boolean }) {
  const keyboard = useKeyboardInset();
  return (
    <div
      data-slot="sticky-action-bar"
      style={{ ...style, bottom: keyboard > 0 || !aboveDock ? keyboard : 'var(--above-dock)' }}
      className={cn(
        'sticky z-20 -mx-4 mt-auto flex items-center gap-3 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] supports-backdrop-filter:backdrop-blur-sm',
        // In a drawer the popup already clears the home bar below its scroll area.
        'in-data-[slot=drawer-popup]:pb-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
