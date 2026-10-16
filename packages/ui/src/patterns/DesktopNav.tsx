'use client';

import type { ReactElement, ReactNode } from 'react';
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { IconBell, IconShoppingBag, IconUser } from '@tabler/icons-react';

import { Button } from '#components/button';
import { initials, type ShellNavItem } from '#lib/nav';
import { cn } from '#lib/utils';

export interface DesktopNavProps {
  name: string;
  logoUrl?: string | null;
  baseHref: string;
  brandLink?: ReactElement;
  items: readonly ShellNavItem[];
  areaPill?: ReactNode;
  onOpenUpdates?: () => void;
  updateCount?: number;
  accountHref: string;
  accountLink?: ReactElement;
  cartText: string;
  cartCount: number;
  onOpenCart: () => void;
  addedCount?: number;
  className?: string;
}

function NavItemLink({ item }: { item: ShellNavItem }) {
  return useRender({
    render: item.link,
    props: mergeProps<'a'>(
      {
        'aria-current': item.active ? 'page' : undefined,
        children: item.label,
      },
      {
        className: cn(
          'pressable flex h-10 items-center rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
          item.active
            ? 'bg-shop-10-soft font-bold text-shop-10'
            : 'text-shop-30-foreground/75 hover:bg-shop-30-foreground/5 hover:text-shop-30-foreground',
        ),
      },
    ),
    state: { active: item.active },
  });
}

function NavBrandLink({
  brandLink,
  baseHref,
  name,
  logoUrl,
}: {
  brandLink?: ReactElement | undefined;
  baseHref: string;
  name: string;
  logoUrl?: string | null | undefined;
}) {
  const content = (
    <>
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="size-9 rounded-full object-cover border border-shop-30-foreground/15" />
      ) : (
        <div className="flex size-9 items-center justify-center rounded-full bg-shop-10 text-xs font-bold text-shop-10-foreground">
          {initials(name)}
        </div>
      )}
      <span className="truncate text-base font-bold tracking-tight">{name}</span>
    </>
  );

  return useRender({
    render: brandLink ?? <a href={baseHref} />,
    props: {
      children: content,
      className: 'flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg',
    },
  });
}

function NavAccountLink({
  accountLink,
  accountHref,
}: {
  accountLink?: ReactElement | undefined;
  accountHref: string;
}) {
  const content = <IconUser className="size-5" />;
  const linkClass = 'pressable flex size-10 items-center justify-center rounded-full hover:bg-shop-10-soft text-shop-30-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors';

  return useRender({
    render: accountLink ?? <a href={accountHref} />,
    props: {
      'aria-label': 'Account',
      children: content,
      className: linkClass,
    },
  });
}

/**
 * Desktop navigation header (1024 px and up, 64 px high):
 * logo, shop name, nav links (Home, Menu, Rewards, Orders), Area pill,
 * updates bell, account avatar, and cart button.
 */
export function DesktopNav({
  name,
  logoUrl,
  baseHref,
  brandLink,
  items,
  areaPill,
  onOpenUpdates,
  updateCount = 0,
  accountHref,
  accountLink,
  cartText,
  cartCount,
  onOpenCart,
  addedCount = 0,
  className,
}: DesktopNavProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 hidden h-16 w-full items-center border-b border-shop-30-foreground/10 bg-shop-30/95 text-shop-30-foreground shadow-xs backdrop-blur lg:flex',
        className,
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <NavBrandLink brandLink={brandLink} baseHref={baseHref} name={name} logoUrl={logoUrl} />

        {/* Navigation links */}
        <nav aria-label="Main navigation" className="flex items-center gap-1.5">
          {items.map((item) => (
            <NavItemLink key={item.key} item={item} />
          ))}
        </nav>

        {/* Right utility items */}
        <div className="flex items-center gap-2.5">
          {areaPill}

          <button
            type="button"
            onClick={onOpenUpdates}
            aria-label={updateCount > 0 ? `Updates (${String(updateCount)})` : 'Updates'}
            className="relative pressable flex size-10 items-center justify-center rounded-full hover:bg-shop-10-soft text-shop-30-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            <IconBell className="size-5" />
            {updateCount > 0 && (
              <span className="absolute top-2 right-2 flex size-2 rounded-full bg-destructive" />
            )}
          </button>

          <NavAccountLink accountLink={accountLink} accountHref={accountHref} />

          <Button
            key={addedCount}
            variant="shop"
            size="default"
            onClick={onOpenCart}
            aria-label={`Open cart: ${cartText}`}
            className={cn('gap-2 rounded-full px-4', addedCount > 0 && 'bump')}
          >
            <IconShoppingBag className="size-4 shrink-0" aria-hidden="true" />
            <span className="tabular font-bold">{cartCount > 0 ? cartText : 'Cart'}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
