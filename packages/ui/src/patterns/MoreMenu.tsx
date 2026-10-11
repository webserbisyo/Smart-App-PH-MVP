'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { useState } from 'react';
import type { ComponentProps, ReactElement } from 'react';

import { IconX } from '@tabler/icons-react';

import { Button } from '#components/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '#components/drawer';
import type { ShellNavItem } from '#lib/nav';
import { cn } from '#lib/utils';

// Copied and trimmed from the first build's MoreMenu (webserbisyo/Smart-App-PH, redesign/v3-home).

export interface MoreMenuProps {
  /** "More". */
  label: string;
  /** "Close". */
  closeLabel: string;
  items: readonly ShellNavItem[];
  /** The dock slot that opens it, without its own click handler. */
  trigger: ReactElement;
}

/** The app's own link element as a tile, with `aria-current` and `data-active`. */
function TileLink({ item, ...props }: { item: ShellNavItem } & Omit<ComponentProps<'a'>, 'children'>) {
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
              className="relative flex size-12 items-center justify-center rounded-2xl bg-muted text-foreground transition-colors duration-fast group-data-active/tile:bg-primary-soft group-data-active/tile:text-primary-soft-foreground [&>svg]:size-6"
            >
              {icon}
              {item.count ? <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-warning ring-2 ring-popover" /> : null}
            </span>
            <span className="line-clamp-2 text-center text-sm leading-tight font-medium">{item.label}</span>
          </>
        ),
      },
      props,
    ),
    state: { active: item.active },
  });
}

/** The phone dock's More: a sheet from the bottom with the other places as tiles (swipe down to close). */
export function MoreMenu({ label, closeLabel, items, trigger }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
      <DrawerTrigger render={trigger} />
      <DrawerContent className="pb-safe">
        <DrawerHeader className="flex-row items-center justify-between px-4 pt-2 pb-2">
          <DrawerTitle className="text-lg font-semibold">{label}</DrawerTitle>
          <DrawerClose render={<Button variant="ghost" size="icon" aria-label={closeLabel} />}>
            <IconX aria-hidden="true" className="size-5" />
          </DrawerClose>
        </DrawerHeader>
        <nav aria-label={label} className="overflow-y-auto overscroll-contain px-3 pb-4">
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {items.map((item) => (
              <li key={item.key}>
                <TileLink
                  item={item}
                  onClick={() => {
                    setOpen(false);
                  }}
                  className={cn(
                    'pressable group/tile flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl p-2 text-foreground outline-none select-none',
                    'hover-surface focus-visible:ring-2 focus-visible:ring-ring data-active:font-semibold',
                  )}
                />
              </li>
            ))}
          </ul>
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
