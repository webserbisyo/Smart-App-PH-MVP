'use client';

import type { ReactNode } from 'react';

import { SidebarProvider } from '#components/sidebar';
import type { FormFactorShell } from '#hooks/use-form-factor';
import { useKeyboardOpen } from '#hooks/use-keyboard-open';
import { cssVars } from '#lib/style';
import { cn } from '#lib/utils';

// Copied and trimmed from the first build's AppShell (reference/packages/ui/src/patterns/AppShell.tsx):
// no full-screen layers, side panel or banners yet.

export interface AppShellProps {
  /** From `useFormFactor()`: decides the layout through `data-shell` (CSS), one component tree for every size. */
  shell: FormFactorShell;
  /** "Skip to content". */
  skipLabel: string;
  topBar: ReactNode;
  /** The dock (phone) or the sidebar (tablet: the icon rail; desktop). One nav per device. */
  nav: ReactNode;
  /** Desktop: the remembered choice. Tablet: open over the page until closed. */
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Every dashboard page. The document scrolls (sticky top bar, fixed dock), so pull-to-refresh, scroll
 * restoration and the browser's own bars work as usual. Sidebar 248 px, icon rail 72 px.
 */
export function AppShell({ shell, skipLabel, topBar, nav, sidebarOpen, onSidebarOpenChange, children }: AppShellProps) {
  const keyboardOpen = useKeyboardOpen();
  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={onSidebarOpenChange}
      data-shell={shell}
      data-keyboard={keyboardOpen ? 'open' : 'closed'}
      style={cssVars({ '--sidebar-width': '15.5rem', '--sidebar-width-icon': 'var(--rail-width)' })}
      className="min-h-dvh bg-background text-foreground"
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {skipLabel}
      </a>
      {nav}
      <div className="flex min-w-0 flex-1 flex-col">
        {topBar}
        <main
          id="main"
          tabIndex={-1}
          className={cn(
            'mx-auto w-full max-w-400 min-w-0 flex-1 px-4 pt-4 pb-8 outline-none',
            'text-base pointer-fine:text-sm',
            'shell-phone:pb-dock',
            'shell-tablet:px-6 shell-tablet:pt-6',
            'shell-desktop:px-8 shell-desktop:pt-6',
          )}
        >
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
