'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import type { ComponentProps, ReactNode } from 'react';

import { IconDots } from '@tabler/icons-react';

import { countText } from '#lib/nav';
import type { ShellNavItem } from '#lib/nav';
import { cn } from '#lib/utils';

import { MoreMenu } from './MoreMenu';

// Copied and trimmed from the first build's V3 BottomDock (webserbisyo/Smart-App-PH, redesign/v3-home).
// Trimmed: the raised centre button (its job was Sell / POS, not in the MVP) and the More sheet's action rows.

export interface BottomDockProps {
  /** aria-label of the nav ("Main"). */
  label: string;
  /** Up to 5 (4 when there is a More). */
  items: readonly ShellNavItem[];
  /** Entries behind a More button (last slot). Empty: no More. */
  more?: { label: string; closeLabel: string; items: readonly ShellNavItem[] };
}

export const dockSlotClass = cn(
  'pressable group/slot flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full select-none',
  'text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
  'data-active:font-bold data-active:text-foreground',
);

const iconPill = cn(
  'relative flex h-8 w-14 max-w-full items-center justify-center rounded-full transition-colors duration-fast [&>svg]:size-5',
  'group-data-active/slot:bg-primary-soft group-data-active/slot:text-primary-soft-foreground',
);

export function DockSlot({ icon, label, count }: { icon: ReactNode; label: string; count: number }) {
  return (
    <>
      <span aria-hidden="true" className={iconPill}>
        {icon}
        {count > 0 ? (
          <span className="tabular absolute -top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[0.625rem] leading-none font-bold text-warning-foreground ring-2 ring-card">
            {countText(count)}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate px-0.5">{label}</span>
      {count > 0 ? <span className="sr-only">{` (${countText(count)})`}</span> : null}
    </>
  );
}

/** The app's own link element with the slot's classes, `aria-current` and `data-active`. */
function DockLink({ item, ...props }: { item: ShellNavItem } & Omit<ComponentProps<'a'>, 'children'>) {
  const icon = item.active && item.activeIcon !== undefined ? item.activeIcon : item.icon;
  return useRender({
    render: item.link,
    props: mergeProps<'a'>(
      { 'aria-current': item.active ? 'page' : undefined, children: <DockSlot icon={icon} label={item.label} count={item.count ?? 0} /> },
      props,
    ),
    state: { active: item.active },
  });
}

/**
 * Phone nav: a floating pill, 64 px tall, 12 px above the bottom safe area, max 440 px wide, up to 5 places
 * with labels always shown and 56 px targets; the selected one shows its filled icon. Never hides on scroll;
 * hides only while the on-screen keyboard is open.
 */
export function BottomDock({ label, items, more }: BottomDockProps) {
  const moreItems = more?.items ?? [];
  const moreActive = moreItems.some((item) => item.active);
  const moreCount = moreItems.reduce((sum, item) => sum + (item.count ?? 0), 0);
  return (
    <nav
      aria-label={label}
      className={cn(
        'fixed inset-x-0 z-40 mx-auto flex h-(--dock-height) w-[calc(100%-2rem)] max-w-(--dock-max-width) items-center gap-1 px-1.5',
        'bottom-[calc(var(--dock-offset)+env(safe-area-inset-bottom))]',
        'rounded-full bg-card/95 shadow-lg ring-1 ring-border backdrop-blur supports-backdrop-filter:bg-card/85',
        'keyboard-open:hidden',
      )}
    >
      {items.map((item) => (
        <DockLink key={item.key} item={item} className={dockSlotClass} />
      ))}
      {more && moreItems.length > 0 ? (
        <MoreMenu
          label={more.label}
          closeLabel={more.closeLabel}
          items={moreItems}
          trigger={
            <button type="button" className={dockSlotClass} data-active={moreActive ? '' : undefined}>
              <DockSlot icon={<IconDots />} label={more.label} count={moreCount} />
            </button>
          }
        />
      ) : null}
    </nav>
  );
}
