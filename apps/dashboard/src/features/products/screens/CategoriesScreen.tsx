import { useState } from 'react';

import { mediaUrl, useCatalog, useCategories, useSaveCategory, useSaveSortOrder } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import type { Category } from '@smartapp/core';
import { FLUENT_ICONS } from '@smartapp/ui/assets/fluent';
import { Button } from '@smartapp/ui/components/button';
import { Label } from '@smartapp/ui/components/label';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { toast } from '@smartapp/ui/components/sonner';
import { Sortable, SortableContent, SortableItem, SortableItemHandle } from '@smartapp/ui/components/sortable';
import { Switch } from '@smartapp/ui/components/switch';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconGripVertical, IconPencil, IconPlus } from '@smartapp/ui/icons';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';
import { PageBody } from '@smartapp/ui/patterns/PageBody';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { StickyActionBar } from '@smartapp/ui/patterns/StickyActionBar';

import { useShop, useVocab } from '../../../app/shop';
import { countByCategory } from '../catalog';
import { CategoryDialog } from '../components/CategoryDialog';
import { useCategoryDialog } from '../hooks/useCategoryDialog';

const words = WORDS.dashboard.products;
const shared = WORDS.shared;

function HiddenSwitch({ category, disabled }: { category: Category; disabled: boolean }) {
  const save = useSaveCategory();
  const [pending, setPending] = useState<boolean | null>(null);
  const id = `hidden-${category.id}`;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {words.hidden}
      </Label>
      <Switch
        id={id}
        checked={pending ?? category.isHidden}
        disabled={disabled || pending !== null}
        onCheckedChange={(isHidden) => {
          setPending(isHidden);
          save.mutate(
            { id: category.id, name: category.name, isHidden, icon: category.icon },
            {
              onSettled: () => {
                setPending(null);
              },
              onError: () => {
                toast.error(words.changeFailed);
              },
            },
          );
        }}
      />
    </div>
  );
}

/** Categories in the owner's order (drag to sort), each with its icon, count and a hidden switch; tap to edit. */
export default function CategoriesScreen() {
  const shop = useShop();
  const vocab = useVocab();
  const online = useOnline();
  const phone = useFormFactor() === 'phone';
  const categories = useCategories(shop.id);
  const catalog = useCatalog(shop.id);
  const sortOrder = useSaveSortOrder();
  const dialog = useCategoryDialog();
  // The dragged order shows at once; it clears once the saved order is back from the database.
  const [dragged, setDragged] = useState<Category[] | null>(null);

  const list = dragged ?? categories.data ?? [];
  const counts = countByCategory(catalog.data ?? []);
  const state = categories.isPending ? 'loading' : categories.isError ? 'error' : list.length === 0 ? 'empty' : 'ready';
  const addButton = (
    <Button
      className={phone ? 'w-full' : undefined}
      disabled={!online}
      onClick={() => {
        dialog.openFor(null);
      }}
    >
      <IconPlus aria-hidden="true" />
      {words.category.add}
    </Button>
  );

  return (
    <PageBody size="settings" className="min-h-full">
      {phone ? null : <div className="flex justify-end">{addButton}</div>}

      <QueryState
        state={state}
        skeleton={
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        }
        empty={{
          media: <img src={FLUENT_ICONS.label.url} alt="" className="size-10" />,
          title: words.category.emptyTitle,
          description: words.category.emptyText,
          action: addButton,
        }}
        error={{
          title: shared.loadFailed,
          retryLabel: shared.tryAgain,
          onRetry: () => {
            void categories.refetch();
          },
        }}
        offline={online ? null : { title: shared.offlineShort }}
      >
        <Sortable
          value={list}
          getItemValue={(category) => category.id}
          orientation="vertical"
          onValueChange={(next) => {
            if (!online) return;
            setDragged(next);
            sortOrder.mutate(
              { kind: 'categories', ids: next.map((category) => category.id) },
              {
                onSettled: () => {
                  setDragged(null);
                },
                onError: () => {
                  toast.error(words.changeFailed);
                },
              },
            );
          }}
        >
          <SortableContent render={<ul />} className="flex flex-col gap-2">
            {list.map((category) => (
              <SortableItem
                key={category.id}
                value={category.id}
                render={<li />}
                className="flex min-h-16 items-center gap-2 rounded-xl border bg-card py-2 pr-4 pl-1"
              >
                <SortableItemHandle disabled={!online} render={<Button variant="ghost" size="icon-sm" aria-label={words.category.move(category.name)} />}>
                  <IconGripVertical />
                </SortableItemHandle>
                <button
                  type="button"
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  aria-label={words.category.editNamed(category.name)}
                  onClick={() => {
                    dialog.openFor(category);
                  }}
                >
                  <CategoryIcon icon={category.icon} imageUrl={(path) => mediaUrl(path, 'thumb')} className="size-9" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{category.name}</span>
                    <span className="text-sm text-muted-foreground">{words.count(counts.get(category.id) ?? 0, vocab.item)}</span>
                  </span>
                  <IconPencil aria-hidden="true" className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </button>
                <HiddenSwitch category={category} disabled={!online} />
              </SortableItem>
            ))}
          </SortableContent>
        </Sortable>
      </QueryState>

      {phone && state === 'ready' ? <StickyActionBar aboveDock>{addButton}</StickyActionBar> : null}

      <CategoryDialog {...dialog.props} />
    </PageBody>
  );
}
