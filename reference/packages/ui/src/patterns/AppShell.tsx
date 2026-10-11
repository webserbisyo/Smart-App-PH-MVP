import type { ReactNode } from 'react';

import { SidebarProvider } from '#components/sidebar';
import type { FormFactorShell } from '#hooks/use-form-factor';
import { useKeyboardOpen } from '#hooks/use-keyboard-open';
import { cn } from '#lib/utils';

export interface AppShellProps {
  /** From `useFormFactor()`: decides the layout through `data-shell` (CSS) — one component tree for every size. */
  shell: FormFactorShell;
  /** "Skip to content". */
  skipLabel: string;
  /** Support, offline and (later) billing banners, above everything (the layer too). */
  banners?: ReactNode;
  topBar: ReactNode;
  /**
   * A full-screen layer (Settings, Account) is open: no nav, no top bar; `children` is the layer, which brings its
   * own bar and `main`.
   */
  layer?: boolean;
  /** The dock (phone) or the sidebar (tablet: collapsed to the icon rail; desktop) for this shell; nothing in focus mode. */
  nav?: ReactNode;
  /** A bar that sits directly above the dock (save bar, later the cart bar). */
  bottomBar?: ReactNode;
  /** Wide screens (≥ 1280): an optional 400 px side panel. Empty for now. */
  sidePanel?: ReactNode;
  /** Remembered open / collapsed state of the desktop sidebar. */
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Every logged-in page. The document scrolls (sticky top bar, fixed dock): no inner scroll container,
 * so pull-to-refresh, scroll restoration and the browser's own bars work as usual.
 */
export function AppShell({
  shell,
  skipLabel,
  banners,
  topBar,
  layer = false,
  nav,
  bottomBar,
  sidePanel,
  sidebarOpen,
  onSidebarOpenChange,
  children,
}: AppShellProps) {
  const keyboardOpen = useKeyboardOpen();
  const hasNav = !layer && nav !== undefined && nav !== null && nav !== false;
  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={onSidebarOpenChange}
      data-shell={shell}
      data-keyboard={keyboardOpen ? 'open' : 'closed'}
      data-has-nav={hasNav ? '' : undefined}
      className="min-h-dvh bg-background text-foreground"
    >
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {skipLabel}
      </a>
      {hasNav ? nav : null}
      <div className="flex min-w-0 flex-1 flex-col">
        {banners}
        {layer ? (
          children
        ) : (
          <>
            {topBar}
            <div className="flex min-w-0 flex-1">
              <main
                id="main"
                tabIndex={-1}
                className={cn(
                  'mx-auto w-full min-w-0 flex-1 px-4 pt-4 pb-8 outline-none',
                  'text-base pointer-fine:text-sm',
                  'shell-phone:in-data-has-nav:pb-dock',
                  'shell-tablet:px-6 shell-tablet:pt-6',
                  // No cap here: each page picks its width with `PageBody size` (fluid to 1,600 px at most).
                  'shell-desktop:px-8 shell-desktop:pt-6',
                )}
              >
                {children}
              </main>
              {sidePanel ? <aside className="hidden w-100 shrink-0 border-l border-border shell-wide:block">{sidePanel}</aside> : null}
            </div>
          </>
        )}
        {bottomBar ? (
          <div
            className={cn(
              'sticky bottom-0 z-30 px-4 pb-safe',
              // An empty portal target (nothing to show yet) takes no room.
              'has-[[data-slot=bottom-bar]:empty]:hidden',
              'shell-phone:in-data-has-nav:bottom-above-dock shell-phone:in-data-has-nav:pb-0',
              'keyboard-open:bottom-0',
            )}
          >
            {bottomBar}
          </div>
        ) : null}
      </div>
    </SidebarProvider>
  );
}
