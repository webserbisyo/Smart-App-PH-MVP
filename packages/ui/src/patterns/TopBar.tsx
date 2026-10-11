import type { ReactNode } from 'react';

import { cn } from '#lib/utils';

export interface TopBarProps {
  /** Before the title: the sidebar toggle (tablet, desktop) or Back (phone sub-pages). */
  leading?: ReactNode;
  /** Breadcrumbs on tablet and desktop; the page title on phones. */
  title: ReactNode;
  /** At the end: account menu, later the bell. */
  actions?: ReactNode;
}

/** The sticky bar above every dashboard page: 56 px on phones, 64 px from tablets up. */
export function TopBar({ leading, title, actions }: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-(--topbar-height) shrink-0 items-center gap-2 border-b border-border bg-background/95 px-2 pt-safe backdrop-blur',
        'supports-backdrop-filter:bg-background/80 md:h-(--topbar-height-desktop) md:px-4',
      )}
    >
      {leading}
      <div className="flex min-w-0 flex-1 items-center">{title}</div>
      {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
    </header>
  );
}
