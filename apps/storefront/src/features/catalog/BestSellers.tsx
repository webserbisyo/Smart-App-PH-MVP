'use client';

import { itemSoldOut, WORDS } from '@smartapp/core';
import { Scroller } from '@smartapp/ui/components/scroller';

import { useShop } from '../shell/ShopProvider';
import { ItemCard } from './ItemCard';

/** The owner's featured items in a sideways row; sold-out ones last. Nothing when none are featured. */
export function BestSellers() {
  const { storefront } = useShop();
  const featured = storefront.items
    .filter((item) => item.isFeatured)
    .toSorted((a, b) => Number(itemSoldOut(a)) - Number(itemSoldOut(b)));
  if (featured.length === 0) return null;
  const title = WORDS.storefront.home.bestSellers;
  return (
    <section aria-labelledby="best-sellers" className="flex flex-col gap-3">
      <h2 id="best-sellers" className="text-lg font-semibold">
        {title}
      </h2>
      <Scroller orientation="horizontal" hideScrollbar withNavigation render={<ul />} className="flex snap-x gap-3 pb-1">
        {featured.map((item) => (
          <li key={item.id} className="w-40 shrink-0 snap-start sm:w-44">
            <ItemCard item={item} className="h-full" />
          </li>
        ))}
      </Scroller>
    </section>
  );
}
