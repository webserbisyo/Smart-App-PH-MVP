import { z } from 'zod';

import { Centavos, ItemStatus, Uuid, WORDS } from '@smartapp/core';
import type { CatalogItem, ItemDraft, OptionGroup, OptionGroupDraft } from '@smartapp/core';

// The product editor's form: what the owner types, checked here, then turned into the drafts packages/api saves
// (option groups first, then `save_item`, then `set_stock` for counted stock).

const errors = WORDS.dashboard.products.editor.errors;

/** The most photos an item shows (ux-plan 5.12). */
export const MAX_PHOTOS = 5;

const VariantValue = z.object({
  id: Uuid.nullable(),
  name: z.string().max(60),
  price: Centavos.nullable(),
  /** Only used while "Track stock" is on. */
  stock: z.int().nonnegative().nullable(),
  isSoldOut: z.boolean(),
});
export type VariantValue = z.infer<typeof VariantValue>;

const OptionValue = z.object({
  id: Uuid.nullable(),
  name: z.string().max(60),
  priceDelta: Centavos.nullable(),
  isSoldOut: z.boolean(),
});
export type OptionValue = z.infer<typeof OptionValue>;

const GroupValue = z.object({
  id: Uuid.nullable(),
  name: z.string().max(60),
  /** The customer must pick at least one. */
  required: z.boolean(),
  maxSelect: z.int().nullable(),
  options: z.array(OptionValue),
});
export type GroupValue = z.infer<typeof GroupValue>;

export const ProductForm = z
  .object({
    name: z.string().max(80),
    categoryId: Uuid.nullable(),
    description: z.string().max(500),
    /** `shop-media` paths in order; the first is the cover. */
    photos: z.array(z.object({ path: z.string().min(1) })).max(MAX_PHOTOS),
    variants: z.array(VariantValue).min(1),
    trackStock: z.boolean(),
    lowStockAt: z.int().nonnegative().nullable(),
    groups: z.array(GroupValue),
    status: ItemStatus,
    isFeatured: z.boolean(),
  })
  .superRefine((form, ctx) => {
    if (form.name.trim() === '') ctx.addIssue({ code: 'custom', path: ['name'], message: errors.name });
    const named = form.variants.length > 1;
    form.variants.forEach((variant, index) => {
      if (named && variant.name.trim() === '') ctx.addIssue({ code: 'custom', path: ['variants', index, 'name'], message: errors.variantName });
      if (variant.price === null) ctx.addIssue({ code: 'custom', path: ['variants', index, 'price'], message: errors.price });
      if (form.trackStock && variant.stock === null) ctx.addIssue({ code: 'custom', path: ['variants', index, 'stock'], message: errors.stock });
    });
    form.groups.forEach((group, index) => {
      if (group.name.trim() === '') ctx.addIssue({ code: 'custom', path: ['groups', index, 'name'], message: errors.groupName });
      if (group.options.length === 0) ctx.addIssue({ code: 'custom', path: ['groups', index, 'options'], message: errors.options });
      group.options.forEach((option, optionIndex) => {
        if (option.name.trim() === '') ctx.addIssue({ code: 'custom', path: ['groups', index, 'options', optionIndex, 'name'], message: errors.option });
      });
      if (group.maxSelect === null || group.maxSelect < 1 || group.maxSelect > Math.max(1, group.options.length)) {
        ctx.addIssue({ code: 'custom', path: ['groups', index, 'maxSelect'], message: errors.maxChoices });
      }
    });
  });
export type ProductForm = z.infer<typeof ProductForm>;

function isRowKey(key: string): key is `${number}` {
  return /^\d+$/.test(key);
}

/**
 * A list index as a form path segment (`variants.${row(index)}.name`): React Hook Form paths are typed with
 * `${number}`, and lint keeps raw numbers out of template strings.
 */
export function row(index: number): `${number}` {
  const key = String(index);
  if (!isRowKey(key)) throw new Error(`Not a list index: ${key}`);
  return key;
}

/** A typed whole number: "12" → 12, "" → null; anything else keeps the current value. */
export function parseCount(text: string, current: number | null): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  return /^\d{1,6}$/.test(trimmed) ? Number(trimmed) : current;
}

export function emptyVariant(): VariantValue {
  return { id: null, name: '', price: null, stock: null, isSoldOut: false };
}

export function emptyOption(): OptionValue {
  return { id: null, name: '', priceDelta: 0, isSoldOut: false };
}

export function emptyGroup(): GroupValue {
  return { id: null, name: '', required: false, maxSelect: 1, options: [emptyOption()] };
}

export function groupValue(group: OptionGroup): GroupValue {
  return {
    id: group.id,
    name: group.name,
    required: group.minSelect > 0,
    maxSelect: group.maxSelect,
    options: group.options.map((option) => ({ id: option.id, name: option.name, priceDelta: option.priceDelta, isSoldOut: option.isSoldOut })),
  };
}

/** A new item: one price row, visible, in the category the owner was looking at. */
export function emptyProduct(categoryId: string | null): ProductForm {
  return {
    name: '',
    categoryId,
    description: '',
    photos: [],
    variants: [emptyVariant()],
    trackStock: false,
    lowStockAt: null,
    groups: [],
    status: 'active',
    isFeatured: false,
  };
}

/** A saved item as the form shows it; option groups come from the shop's groups, in the item's order. */
export function productFromItem(item: CatalogItem, groups: readonly OptionGroup[]): ProductForm {
  return {
    name: item.name,
    categoryId: item.categoryId,
    description: item.description ?? '',
    photos: item.photos.map((photo) => ({ path: photo.path })),
    variants: item.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      price: variant.price,
      stock: variant.stockOnHand,
      isSoldOut: variant.isSoldOut,
    })),
    trackStock: item.trackStock,
    lowStockAt: item.variants[0]?.lowStockAt ?? null,
    groups: item.optionGroupIds.flatMap((id) => {
      const group = groups.find((candidate) => candidate.id === id);
      return group ? [groupValue(group)] : [];
    }),
    status: item.status,
    isFeatured: item.isFeatured,
  };
}

/** The option groups to save first, in the form's order: "required" means at least one choice. */
export function groupDrafts(form: ProductForm): OptionGroupDraft[] {
  return form.groups.map((group) => ({
    id: group.id,
    name: group.name.trim(),
    minSelect: group.required ? 1 : 0,
    maxSelect: group.maxSelect ?? 1,
    options: group.options.map((option) => ({
      id: option.id,
      name: option.name.trim(),
      priceDelta: option.priceDelta ?? 0,
      isSoldOut: option.isSoldOut,
    })),
  }));
}

/**
 * What `save_item` gets. A single price row is the "no options" item: its name is the default variant name when
 * left empty. The low-stock number applies to every row and only while stock is tracked.
 */
export function itemDraft(form: ProductForm, itemId: string | null, optionGroupIds: readonly string[]): ItemDraft {
  const single = form.variants.length === 1;
  const description = form.description.trim();
  return {
    id: itemId,
    categoryId: form.categoryId,
    name: form.name.trim(),
    description: description === '' ? null : description,
    status: form.status,
    isFeatured: form.isFeatured,
    trackStock: form.trackStock,
    variants: form.variants.map((variant) => ({
      id: variant.id,
      name: single && variant.name.trim() === '' ? WORDS.order.defaultVariant : variant.name.trim(),
      price: variant.price ?? 0,
      lowStockAt: form.trackStock ? form.lowStockAt : null,
      isSoldOut: variant.isSoldOut,
    })),
    photoPaths: form.photos.map((photo) => photo.path),
    optionGroupIds: [...optionGroupIds],
  };
}

/** Stock counts that differ from what was saved; `save_item` keeps variants in the form's order. */
export function stockChanges(form: ProductForm, saved: CatalogItem): { variantId: string; stockOnHand: number }[] {
  if (!form.trackStock) return [];
  return form.variants.flatMap((variant, index) => {
    const target = saved.variants[index];
    if (!target || variant.stock === null || variant.stock === target.stockOnHand) return [];
    return [{ variantId: target.id, stockOnHand: variant.stock }];
  });
}
