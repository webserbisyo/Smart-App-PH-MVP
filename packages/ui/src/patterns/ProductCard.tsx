import type { ReactNode } from 'react';

import { IconPlus } from '@tabler/icons-react';

import { formatPeso } from '@smartapp/core';

import { Badge } from '#components/badge';
import { cn } from '#lib/utils';

import { Money } from './Money';

export interface ProductCardProps {
  name: string;
  photoUrl?: string | null | undefined;
  /** Custom photo element (e.g. Next.js Image with fill & sizes). */
  photo?: ReactNode | undefined;
  /** Shown on the 30% colour when there is no photo: the category's icon (`CategoryIcon`). */
  fallbackIcon: ReactNode;
  /** The lowest variant price, in centavos. */
  price: number;
  /** Variants have different prices: show "from ₱120". */
  priceVaries?: boolean | undefined;
  soldOut?: boolean | undefined;
  /** The shop takes no orders now: the "+" looks off (the app says why when it is tapped). */
  addDisabled?: boolean | undefined;
  words: { soldOut: string; from: (price: string) => string; add: (name: string) => string };
  /** Opens the item sheet. */
  onOpen: () => void;
  /** The round "+": adds directly when there is nothing to choose, else opens the sheet. */
  onAdd: () => void;
  className?: string | undefined;
}

/** A storefront card: photo (or the category icon), name, price, "+". Sold out stays visible, greyed. */
export function ProductCard({
  name,
  photoUrl,
  photo,
  fallbackIcon,
  price,
  priceVaries = false,
  soldOut = false,
  addDisabled = false,
  words,
  onOpen,
  onAdd,
  className,
}: ProductCardProps) {
  return (
    <article
      data-sold-out={soldOut || undefined}
      className={cn('relative flex min-w-0 flex-col overflow-hidden rounded-xl bg-shop-30 text-shop-30-foreground', soldOut && 'opacity-60', className)}
    >
      <button type="button" onClick={onOpen} className="flex flex-col text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-shop-30">
          {photo ? (
            photo
          ) : photoUrl ? (
            <img src={photoUrl} alt="" loading="lazy" decoding="async" className={cn('size-full object-cover', soldOut && 'grayscale')} />
          ) : (
            <span className="flex size-1/2 items-center justify-center *:size-full">{fallbackIcon}</span>
          )}
          {soldOut && (
            <Badge variant="secondary" className="absolute top-2 left-2">
              {words.soldOut}
            </Badge>
          )}
        </div>
        <div className="flex flex-col gap-0.5 p-3 pr-14">
          <h3 className="line-clamp-2 text-sm leading-snug font-semibold">{name}</h3>
          <p className="text-sm font-bold">
            {priceVaries ? words.from(formatPeso(price)) : <Money amount={price} />}
          </p>
        </div>
      </button>
      <button
        type="button"
        onClick={onAdd}
        disabled={soldOut}
        aria-disabled={addDisabled || undefined}
        aria-label={words.add(name)}
        className="pressable absolute right-2 bottom-2 flex size-11 items-center justify-center rounded-full bg-shop-10 text-shop-10-foreground shadow-md outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:hidden aria-disabled:opacity-40 aria-disabled:shadow-none"
      >
        <IconPlus aria-hidden="true" className="size-5" />
      </button>
    </article>
  );
}
