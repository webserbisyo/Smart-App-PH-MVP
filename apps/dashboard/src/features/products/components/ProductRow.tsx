import { Link } from '@tanstack/react-router';
import { useId, useState } from 'react';

import { mediaUrl, useSetItemStatus, useSetVariantSoldOut } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import type { CatalogItem, Category } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { Label } from '@smartapp/ui/components/label';
import { toast } from '@smartapp/ui/components/sonner';
import { Switch } from '@smartapp/ui/components/switch';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { cn } from '@smartapp/ui/lib/utils';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';
import { Money } from '@smartapp/ui/patterns/Money';

import { isSoldOut, priceRange, stockSummary } from '../catalog';

const words = WORDS.dashboard.products;

/** A switch that moves at once and goes back (with a toast) when the save fails. */
function QuickSwitch({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled: boolean; onChange: (next: boolean) => Promise<unknown> }) {
  const id = useId();
  const [pending, setPending] = useState<boolean | null>(null);
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Switch
        id={id}
        checked={pending ?? checked}
        disabled={disabled || pending !== null}
        onCheckedChange={(next) => {
          setPending(next);
          onChange(next).then(
            () => {
              setPending(null);
            },
            () => {
              setPending(null);
              toast.error(words.changeFailed);
            },
          );
        }}
      />
    </div>
  );
}

/** One item in the list: photo or category icon, name, price range, stock, and the Visible and Sold out switches. */
export function ProductRow({ item, category }: { item: CatalogItem; category: Category | null }) {
  const online = useOnline();
  const setStatus = useSetItemStatus();
  const setSoldOut = useSetVariantSoldOut();
  const range = priceRange(item);
  const stock = stockSummary(item);
  const cover = item.photos[0];
  const archived = item.status === 'archived';

  return (
    <li className="flex min-h-16 items-center gap-3 py-2">
      <Link to="/$" params={{ _splat: `products/${item.id}` }} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          {cover ? (
            <img src={mediaUrl(cover.path, 'thumb')} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
          ) : (
            <CategoryIcon icon={category?.icon ?? null} imageUrl={(path) => mediaUrl(path, 'thumb')} className="size-8" />
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className={cn('truncate font-medium', archived && 'text-muted-foreground')}>{item.name}</span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {range ? (
              <span className="tabular">
                <Money amount={range.min} />
                {range.max > range.min ? (
                  <>
                    {' – '}
                    <Money amount={range.max} />
                  </>
                ) : null}
              </span>
            ) : null}
            {stock ? <span className={cn(stock.low && 'font-medium text-warning-text')}>{words.left(stock.left)}</span> : null}
            {archived ? <Badge variant="secondary">{words.archived}</Badge> : null}
          </span>
        </span>
      </Link>
      <div className="flex shrink-0 items-center gap-3">
        <QuickSwitch
          label={words.visible}
          checked={item.status === 'active'}
          disabled={!online}
          onChange={(visible) => setStatus.mutateAsync({ itemId: item.id, status: visible ? 'active' : 'hidden' })}
        />
        <QuickSwitch
          label={words.soldOut}
          checked={isSoldOut(item)}
          disabled={!online || archived}
          onChange={(soldOut) => Promise.all(item.variants.map((variant) => setSoldOut.mutateAsync({ variantId: variant.id, isSoldOut: soldOut })))}
        />
      </div>
    </li>
  );
}
