'use client';

import Link from 'next/link';

import type { Category } from '@smartapp/core';
import { Scroller } from '@smartapp/ui/components/scroller';
import { cn } from '@smartapp/ui/lib/utils';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';

import { useShop } from '../shell/ShopProvider';

const CHIP =
  'pressable flex h-11 shrink-0 items-center gap-2 rounded-full border border-shop-30-foreground/15 bg-shop-30 py-1 pr-4 pl-2 text-sm font-medium text-shop-30-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';
const CHIP_ACTIVE = 'border-shop-10 bg-shop-10 text-shop-10-foreground';

export function sectionId(categoryId: string): string {
  return `category-${categoryId}`;
}

/**
 * Category chips in a sideways scroller. With `hrefBase` each chip links to its menu section (home page);
 * otherwise each chip calls `onPick` and the `active` one is highlighted (menu page).
 */
export function CategoryChips({
  categories,
  label,
  hrefBase,
  active,
  onPick,
  className,
}: {
  categories: readonly Category[];
  label: string;
  hrefBase?: string;
  active?: string | null;
  onPick?: (categoryId: string) => void;
  className?: string;
}) {
  const { media } = useShop();
  return (
    <Scroller orientation="horizontal" hideScrollbar withNavigation aria-label={label} render={<nav />} className={cn('flex gap-2 py-1', className)}>
      {categories.map((category) => {
        const content = (
          <>
            <CategoryIcon icon={category.icon} imageUrl={(path) => media[path]?.thumb ?? ''} className="size-7" />
            <span className="whitespace-nowrap">{category.name}</span>
          </>
        );
        return hrefBase !== undefined ? (
          <Link key={category.id} href={`${hrefBase}#${sectionId(category.id)}`} className={CHIP}>
            {content}
          </Link>
        ) : (
          <button
            key={category.id}
            type="button"
            data-chip={category.id}
            aria-current={active === category.id ? 'true' : undefined}
            className={cn(CHIP, active === category.id && CHIP_ACTIVE)}
            onClick={() => {
              onPick?.(category.id);
            }}
          >
            {content}
          </button>
        );
      })}
    </Scroller>
  );
}
