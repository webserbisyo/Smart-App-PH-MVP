import { Link } from '@tanstack/react-router';
import { useState } from 'react';

import { mediaUrl, useCatalog, useCategories } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import { FLUENT_ICONS } from '@smartapp/ui/assets/fluent';
import { Badge } from '@smartapp/ui/components/badge';
import { buttonVariants } from '@smartapp/ui/components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@smartapp/ui/components/collapsible';
import { Input } from '@smartapp/ui/components/input';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconCategory, IconChevronDown, IconPlus } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';
import { PageBody } from '@smartapp/ui/patterns/PageBody';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { StickyActionBar } from '@smartapp/ui/patterns/StickyActionBar';

import { useShop, useVocab } from '../../../app/shop';
import { groupByCategory } from '../catalog';
import { ProductRow } from '../components/ProductRow';

const words = WORDS.dashboard.products;
const shared = WORDS.shared;

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

/** Everything the shop sells, grouped by category, with search and quick Visible and Sold out switches. */
export default function ProductsScreen() {
  const shop = useShop();
  const vocab = useVocab();
  const online = useOnline();
  const phone = useFormFactor() === 'phone';
  const catalog = useCatalog(shop.id);
  const categories = useCategories(shop.id);
  const [query, setQuery] = useState('');

  const loading = catalog.isPending || categories.isPending;
  const failed = catalog.isError || categories.isError;
  const items = catalog.data ?? [];
  const groups = groupByCategory(items, categories.data ?? [], query);
  const state = loading ? 'loading' : failed ? 'error' : items.length === 0 ? 'empty' : 'ready';

  return (
    <PageBody size="wide" className="min-h-full">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          aria-label={words.search(vocab.catalog)}
          placeholder={words.search(vocab.catalog)}
          value={query}
          className="min-w-0 flex-1 basis-48"
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <Link to="/$" params={{ _splat: 'products/categories' }} className={buttonVariants({ variant: 'outline' })}>
          <IconCategory aria-hidden="true" />
          {words.categories}
        </Link>
        {phone ? null : (
          <Link to="/$" params={{ _splat: 'products/new' }} className={buttonVariants()}>
            <IconPlus aria-hidden="true" />
            {words.add(vocab.item)}
          </Link>
        )}
      </div>

      <QueryState
        state={state}
        skeleton={<ListSkeleton />}
        empty={{
          media: <img src={FLUENT_ICONS['shopping-bags'].url} alt="" className="size-10" />,
          title: words.emptyTitle(vocab.item),
          description: words.emptyText,
          action: (
            <Link to="/$" params={{ _splat: 'products/new' }} className={buttonVariants()}>
              <IconPlus aria-hidden="true" />
              {words.add(vocab.item)}
            </Link>
          ),
        }}
        error={{
          title: shared.loadFailed,
          retryLabel: shared.tryAgain,
          onRetry: () => {
            void catalog.refetch();
            void categories.refetch();
          },
        }}
        offline={online ? null : { title: shared.offlineShort }}
      >
        {groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{words.noResults}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => {
              const name = group.category?.name ?? words.noCategory;
              return (
                <Collapsible key={group.category?.id ?? 'none'} defaultOpen className="rounded-xl border bg-card">
                  <CollapsibleTrigger
                    aria-label={words.toggleGroup(name)}
                    className="group/trigger flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <CategoryIcon icon={group.category?.icon ?? null} imageUrl={(path) => mediaUrl(path, 'thumb')} className="size-7" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
                    {group.category?.isHidden ? <Badge variant="secondary">{words.hidden}</Badge> : null}
                    <span className="text-sm text-muted-foreground tabular">{group.items.length}</span>
                    <IconChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="divide-y border-t px-4">
                      {group.items.map((item) => (
                        <ProductRow key={item.id} item={item} category={group.category} />
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </QueryState>

      {phone && state !== 'empty' ? (
        <StickyActionBar aboveDock>
          <Link to="/$" params={{ _splat: 'products/new' }} className={cn(buttonVariants(), 'w-full')}>
            <IconPlus aria-hidden="true" />
            {words.add(vocab.item)}
          </Link>
        </StickyActionBar>
      ) : null}
    </PageBody>
  );
}
