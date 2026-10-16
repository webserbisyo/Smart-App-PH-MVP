'use client';

import Image from 'next/image';

import { itemPrice, itemSoldOut, WORDS } from '@smartapp/core';
import type { StorefrontItem } from '@smartapp/core';
import { cn } from '@smartapp/ui/lib/utils';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';
import { ProductCard } from '@smartapp/ui/patterns/ProductCard';

import { useShop } from '../shell/ShopProvider';

/** A menu card for one item: opens the item sheet; "+" adds at once when there is nothing to choose. */
export function ItemCard({ item, className }: { item: StorefrontItem; className?: string }) {
  const { storefront, media, block, openItem, quickAdd } = useShop();
  const { price, varies } = itemPrice(item);
  const [photo] = item.photos;
  const category = storefront.categories.find((candidate) => candidate.id === item.categoryId);
  const isSoldOut = itemSoldOut(item);
  const photoMedia = photo ? media[photo.path] : undefined;

  return (
    <ProductCard
      name={item.name}
      photo={
        photoMedia ? (
          <Image
            src={photoMedia.full}
            alt={item.name}
            fill
            sizes="(min-width: 1280px) 240px, (min-width: 1024px) 30vw, 45vw"
            className={cn('size-full object-cover', isSoldOut && 'grayscale')}
          />
        ) : null
      }
      photoUrl={photoMedia?.thumb ?? null}
      fallbackIcon={<CategoryIcon icon={category?.icon ?? null} imageUrl={(path) => media[path]?.thumb ?? ''} />}
      price={price}
      priceVaries={varies}
      soldOut={isSoldOut}
      addDisabled={block !== null}
      words={WORDS.shared.product}
      onOpen={() => {
        openItem(item.id);
      }}
      onAdd={() => {
        quickAdd(item);
      }}
      {...(className === undefined ? {} : { className })}
    />
  );
}
