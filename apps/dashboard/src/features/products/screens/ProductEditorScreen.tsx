import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useBlocker, useLocation, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { ApiError, useCatalog, useCategories, useDeleteItem, useOptionGroups, useSaveItem, useSaveOptionGroup, useSetItemStatus, useSetStock } from '@smartapp/api';
import { errorWords, matchModulePath, WORDS } from '@smartapp/core';
import type { ApiErrorCode, CatalogItem, Category, OptionGroup } from '@smartapp/core';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@smartapp/ui/components/alert-dialog';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@smartapp/ui/components/collapsible';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { toast } from '@smartapp/ui/components/sonner';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Switch } from '@smartapp/ui/components/switch';
import { Textarea } from '@smartapp/ui/components/textarea';
import { useFormFactor } from '@smartapp/ui/hooks/use-form-factor';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconChevronDown, IconTrash } from '@smartapp/ui/icons';
import { PageBody } from '@smartapp/ui/patterns/PageBody';
import { QueryState } from '@smartapp/ui/patterns/QueryState';
import { StickyActionBar } from '@smartapp/ui/patterns/StickyActionBar';

import { useShop, useVocab } from '../../../app/shop';
import { CategoryDialog } from '../components/CategoryDialog';
import { CountInput } from '../components/CountInput';
import { EditorAddOns } from '../components/EditorAddOns';
import { EditorPhotos } from '../components/EditorPhotos';
import { EditorVariants } from '../components/EditorVariants';
import { emptyProduct, groupDrafts, itemDraft, ProductForm, productFromItem, stockChanges } from '../form';
import { useCategoryDialog } from '../hooks/useCategoryDialog';

const words = WORDS.dashboard.products.editor;
const shared = WORDS.shared;
const NEW_CATEGORY = '__new__';

function codeOf(error: unknown): ApiErrorCode {
  return error instanceof ApiError ? error.code : 'unknown';
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SwitchRow({ id, label, description, checked, onChange, disabled }: { id: string; label: string; description: string; checked: boolean; onChange: (checked: boolean) => void; disabled: boolean }) {
  return (
    <Field orientation="horizontal" className="justify-between">
      <div className="flex flex-col gap-0.5">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription>{description}</FieldDescription>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </Field>
  );
}

interface EditorProps {
  item: CatalogItem | null;
  categories: readonly Category[];
  shopGroups: readonly OptionGroup[];
  catalog: readonly CatalogItem[];
}

function Editor({ item, categories, shopGroups, catalog }: EditorProps) {
  const vocab = useVocab();
  const online = useOnline();
  const phone = useFormFactor() === 'phone';
  const navigate = useNavigate();
  const saveGroup = useSaveOptionGroup();
  const saveItem = useSaveItem();
  const setStock = useSetStock();
  const deleteItem = useDeleteItem();
  const setStatus = useSetItemStatus();
  const categoryDialog = useCategoryDialog();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiErrorCode | null>(null);
  const [confirm, setConfirm] = useState<'delete' | 'archive' | null>(null);
  const leaving = useRef(false);
  const [addOnsOpen, setAddOnsOpen] = useState(() => (item?.optionGroupIds.length ?? 0) > 0);

  const form = useForm<ProductForm>({
    resolver: zodResolver(ProductForm),
    defaultValues: item ? productFromItem(item, shopGroups) : emptyProduct(null),
  });
  const { errors, isDirty } = form.formState;
  const trackStock = useWatch({ control: form.control, name: 'trackStock' });
  const groupCount = useWatch({ control: form.control, name: 'groups' }).length;
  const name = useWatch({ control: form.control, name: 'name' });
  const busy = saving || deleteItem.isPending || setStatus.isPending;
  const disabled = busy || !online;

  const blocker = useBlocker({
    shouldBlockFn: () => form.formState.isDirty && !leaving.current,
    enableBeforeUnload: () => form.formState.isDirty && !leaving.current,
    withResolver: true,
  });

  const leaveTo = (path: string) => {
    leaving.current = true;
    void navigate({ to: '/$', params: { _splat: path }, replace: path !== 'products' });
  };

  const save = async (values: ProductForm) => {
    setSaving(true);
    setSaveError(null);
    try {
      const groups: OptionGroup[] = [];
      for (const draft of groupDrafts(values)) groups.push(await saveGroup.mutateAsync(draft));
      const saved = await saveItem.mutateAsync(itemDraft(values, item?.id ?? null, groups.map((group) => group.id)));
      const changes = stockChanges(values, saved);
      for (const change of changes) await setStock.mutateAsync(change);
      const counted = new Map(changes.map((change) => [change.variantId, change.stockOnHand]));
      const fresh = { ...saved, variants: saved.variants.map((variant) => ({ ...variant, stockOnHand: counted.get(variant.id) ?? variant.stockOnHand })) };
      form.reset(productFromItem(fresh, groups));
      toast.success(words.saved);
      if (!item) leaveTo(`products/${saved.id}`);
    } catch (error) {
      setSaveError(codeOf(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!item) return;
    setConfirm(null);
    deleteItem.mutate(
      { itemId: item.id },
      {
        onSuccess: () => {
          toast.success(words.deleted);
          leaveTo('products');
        },
        onError: (error) => {
          if (error.code === 'item_has_orders') setConfirm('archive');
          else toast.error(errorWords(error.code, vocab));
        },
      },
    );
  };

  const archive = () => {
    if (!item) return;
    setConfirm(null);
    setStatus.mutate(
      { itemId: item.id, status: 'archived' },
      {
        onSuccess: () => {
          toast.success(words.archived);
          leaveTo('products');
        },
        onError: (error) => {
          toast.error(errorWords(error.code, vocab));
        },
      },
    );
  };

  return (
    <PageBody size="form" className="min-h-full">
      <form
        noValidate
        className="flex flex-1 flex-col gap-4"
        onSubmit={(event) => {
          void form.handleSubmit(save)(event);
        }}
      >
        <Section title={words.photos} description={words.photosHint}>
          <Controller
            control={form.control}
            name="photos"
            render={({ field }) => <EditorPhotos value={field.value} onChange={field.onChange} disabled={disabled} />}
          />
        </Section>

        <Section title={words.details}>
          <FieldGroup>
            <Field data-invalid={errors.name !== undefined || undefined}>
              <FieldLabel htmlFor="item-name">{words.name}</FieldLabel>
              <Input id="item-name" maxLength={80} aria-invalid={errors.name !== undefined} disabled={disabled} {...form.register('name')} />
              {errors.name?.message ? <FieldError>{errors.name.message}</FieldError> : null}
            </Field>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="item-category">{words.category}</FieldLabel>
                  <NativeSelect
                    id="item-category"
                    className="w-full"
                    value={field.value ?? ''}
                    disabled={disabled}
                    onChange={(event) => {
                      if (event.target.value === NEW_CATEGORY) {
                        categoryDialog.openFor(null);
                        return;
                      }
                      field.onChange(event.target.value === '' ? null : event.target.value);
                    }}
                  >
                    <NativeSelectOption value="">{WORDS.dashboard.products.noCategory}</NativeSelectOption>
                    {categories.map((category) => (
                      <NativeSelectOption key={category.id} value={category.id}>
                        {category.name}
                      </NativeSelectOption>
                    ))}
                    <NativeSelectOption value={NEW_CATEGORY}>{words.newCategory}</NativeSelectOption>
                  </NativeSelect>
                </Field>
              )}
            />
            <Field>
              <FieldLabel htmlFor="item-description">{words.description}</FieldLabel>
              <Textarea id="item-description" maxLength={500} rows={3} disabled={disabled} {...form.register('description')} />
              <FieldDescription>{words.descriptionHint}</FieldDescription>
            </Field>
          </FieldGroup>
        </Section>

        <Section title={words.prices} description={words.pricesHint}>
          <EditorVariants control={form.control} register={form.register} disabled={disabled} />
        </Section>

        <Section title={words.stockTitle}>
          <Controller
            control={form.control}
            name="trackStock"
            render={({ field }) => (
              <SwitchRow id="item-track-stock" label={words.trackStock} description={words.trackStockHint} checked={field.value} onChange={field.onChange} disabled={disabled} />
            )}
          />
          {trackStock ? (
            <Controller
              control={form.control}
              name="lowStockAt"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="item-low-stock">{words.lowStockAt}</FieldLabel>
                  <CountInput id="item-low-stock" value={field.value} onChange={field.onChange} className="w-24" disabled={disabled} />
                  <FieldDescription>{words.lowStockHint}</FieldDescription>
                </Field>
              )}
            />
          ) : null}
        </Section>

        <Collapsible open={addOnsOpen} onOpenChange={setAddOnsOpen} className="rounded-xl border bg-card">
          <CollapsibleTrigger className="group/trigger flex min-h-14 w-full items-center gap-3 rounded-xl p-4 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-5">
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-semibold">
                {words.addOns}
                {groupCount > 0 ? <span className="ml-2 text-sm font-normal text-muted-foreground tabular">{groupCount}</span> : null}
              </span>
              <span className="text-sm text-muted-foreground">{words.addOnsHint}</span>
            </span>
            <IconChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4 sm:px-5 sm:pb-5">
            <EditorAddOns control={form.control} register={form.register} disabled={disabled} shopGroups={shopGroups} catalog={catalog} itemId={item?.id ?? null} />
          </CollapsibleContent>
        </Collapsible>

        <Section title={words.showing}>
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <SwitchRow
                id="item-visible"
                label={WORDS.dashboard.products.visible}
                description={field.value === 'archived' ? words.archivedHint : words.visibleHint}
                checked={field.value === 'active'}
                onChange={(visible) => {
                  field.onChange(visible ? 'active' : 'hidden');
                }}
                disabled={disabled}
              />
            )}
          />
          <Controller
            control={form.control}
            name="isFeatured"
            render={({ field }) => (
              <SwitchRow id="item-featured" label={words.bestSeller} description={words.bestSellerHint} checked={field.value} onChange={field.onChange} disabled={disabled} />
            )}
          />
        </Section>

        {item ? (
          <Button
            variant="ghost"
            className="self-start text-destructive-text"
            disabled={disabled}
            onClick={() => {
              setConfirm('delete');
            }}
          >
            <IconTrash aria-hidden="true" />
            {words.delete}
          </Button>
        ) : null}

        <StickyActionBar aboveDock={phone} className="flex-col items-stretch gap-2">
          {saveError ? <FieldError>{errorWords(saveError, vocab)}</FieldError> : null}
          {online ? null : <p className="text-sm text-muted-foreground">{words.offlineSave}</p>}
          <Button type="submit" size="lg" disabled={disabled || (item !== null && !isDirty)}>
            {saving ? <Spinner /> : null}
            {saving ? shared.saving : shared.save}
          </Button>
        </StickyActionBar>
      </form>

      <CategoryDialog
        {...categoryDialog.props}
        onDone={(saved) => {
          if (saved) form.setValue('categoryId', saved.id, { shouldDirty: true });
        }}
      />

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'archive' ? words.archiveTitle(name) : words.deleteConfirm(name)}</AlertDialogTitle>
            <AlertDialogDescription>{confirm === 'archive' ? errorWords('item_has_orders', vocab) : words.deleteText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{words.cancel}</AlertDialogCancel>
            {confirm === 'archive' ? (
              <AlertDialogAction onClick={archive}>{words.archive}</AlertDialogAction>
            ) : (
              <AlertDialogAction variant="destructive" onClick={remove}>
                {words.delete}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={blocker.status === 'blocked'}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{words.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{words.leaveText}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => blocker.reset?.()}>
              {words.stay}
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              {words.leave}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageBody>
  );
}

function EditorSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

/** Add (`products/new`) or edit (`products/<id>`) one item: photos, details, prices, stock, add-ons, showing. */
export default function ProductEditorScreen() {
  const shop = useShop();
  const vocab = useVocab();
  const online = useOnline();
  const path = useLocation({ select: (location) => location.pathname.replace(/^\/+|\/+$/g, '') });
  const itemId = path === 'products/new' ? null : (matchModulePath('products/$itemId', path)?.itemId ?? null);
  const catalog = useCatalog(shop.id);
  const categories = useCategories(shop.id);
  const groups = useOptionGroups(shop.id);
  const queries = [catalog, categories, groups];
  const item = itemId === null ? null : (catalog.data?.find((candidate) => candidate.id === itemId) ?? null);

  const state = queries.some((query) => query.isPending) ? 'loading' : queries.some((query) => query.isError) ? 'error' : itemId !== null && item === null ? 'empty' : 'ready';

  if (state !== 'ready') {
    return (
      <PageBody size="form">
        <QueryState
          state={state}
          skeleton={<EditorSkeleton />}
          empty={{
            title: words.notFound(vocab.item),
            action: (
              <Link to="/$" params={{ _splat: 'products' }} className={buttonVariants({ variant: 'outline' })}>
                {words.back(vocab.catalog)}
              </Link>
            ),
          }}
          error={{
            title: shared.loadFailed,
            retryLabel: shared.tryAgain,
            onRetry: () => {
              for (const query of queries) void query.refetch();
            },
          }}
          offline={online ? null : { title: shared.offlineShort }}
        />
      </PageBody>
    );
  }

  return <Editor key={itemId ?? 'new'} item={item} categories={categories.data ?? []} shopGroups={groups.data ?? []} catalog={catalog.data ?? []} />;
}
