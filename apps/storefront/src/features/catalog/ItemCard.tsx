'use client';

import { itemPrice, itemSoldOut, WORDS } from '@smartapp/core';
import type { StorefrontItem } from '@smartapp/core';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';
import { ProductCard } from '@smartapp/ui/patterns/ProductCard';

import { useShop } from '../shell/ShopProvider';

/** A menu card for one item: opens the item sheet; "+" adds at once when there is nothing to choose. */
export function ItemCard({ item, className }: { item: StorefrontItem; className?: string }) {
  const { storefront, media, block, openItem, quickAdd } = useShop();
  const { price, varies } = itemPrice(item);
  const [photo] = item.photos;
  const category = storefront.categories.find((candidate) => candidate.id === item.categoryId);
  return (
    <ProductCard
      name={item.name}
      photoUrl={photo ? (media[photo.path]?.thumb ?? null) : null}
      fallbackIcon={<CategoryIcon icon={category?.icon ?? null} imageUrl={(path) => media[path]?.thumb ?? ''} />}
      price={price}
      priceVaries={varies}
      soldOut={itemSoldOut(item)}
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
