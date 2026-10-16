'use client';

import { useEffect, useState } from 'react';

import { CART_NOTE_MAX, choiceProblem, formatPeso, unitPrice, variantAvailable, WORDS } from '@smartapp/core';
import type { OptionGroup, StorefrontItem } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from '@smartapp/ui/components/carousel';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { Field, FieldContent, FieldLabel, FieldLegend, FieldSet } from '@smartapp/ui/components/field';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { Textarea } from '@smartapp/ui/components/textarea';
import { cn } from '@smartapp/ui/lib/utils';
import { Money } from '@smartapp/ui/patterns/Money';
import { QuantityStepper } from '@smartapp/ui/patterns/QuantityStepper';
import { StickyActionBar } from '@smartapp/ui/patterns/StickyActionBar';

import { useShop } from '../shell/ShopProvider';
import { CHOICE_ROW, PICKED } from '../shell/choice';

const words = WORDS.storefront.item;
const shared = WORDS.shared;

const REQUIRED = 'bg-shop-10 text-shop-10-foreground';

function choiceId(itemId: string, groupId: string): string {
  return `choice-${itemId}-${groupId}`;
}

/** One add-on group: radio when only one can be picked, else checkboxes up to the group's maximum. */
function OptionGroupField({
  item,
  group,
  chosen,
  onChange,
}: {
  item: StorefrontItem;
  group: OptionGroup;
  chosen: readonly string[];
  onChange: (optionIds: string[]) => void;
}) {
  const picked = group.options.filter((option) => chosen.includes(option.id)).map((option) => option.id);
  const single = group.maxSelect === 1;
  const full = picked.length >= group.maxSelect;
  return (
    <FieldSet id={choiceId(item.id, group.id)} className="scroll-mt-4">
      <FieldLegend className="flex w-full items-center justify-between gap-2">
        <span>{group.name}</span>
        <Badge variant="secondary" className={cn(group.minSelect > 0 && REQUIRED)}>
          {group.minSelect > 0 ? words.required : words.optional} · {words.rule(group.minSelect, group.maxSelect)}
        </Badge>
      </FieldLegend>
      {single ? (
        <RadioGroup
          value={picked[0] ?? null}
          onValueChange={(value) => {
            const option = group.options.find((candidate) => candidate.id === value);
            if (option) onChange([option.id]);
          }}
        >
          {group.options.map((option) => (
            <FieldLabel key={option.id} htmlFor={`option-${option.id}`} className={CHOICE_ROW}>
              <RadioGroupItem id={`option-${option.id}`} value={option.id} disabled={option.isSoldOut} className={PICKED} />
              <OptionText name={option.name} priceDelta={option.priceDelta} soldOut={option.isSoldOut} />
            </FieldLabel>
          ))}
        </RadioGroup>
      ) : (
        <div className="grid gap-2">
          {group.options.map((option) => {
            const checked = picked.includes(option.id);
            return (
              <FieldLabel key={option.id} htmlFor={`option-${option.id}`} className={CHOICE_ROW}>
                <Checkbox
                  id={`option-${option.id}`}
                  checked={checked}
                  disabled={option.isSoldOut || (!checked && full)}
                  className={PICKED}
                  onCheckedChange={(next) => {
                    onChange(next ? [...picked, option.id] : picked.filter((id) => id !== option.id));
                  }}
                />
                <OptionText name={option.name} priceDelta={option.priceDelta} soldOut={option.isSoldOut} />
              </FieldLabel>
            );
          })}
        </div>
      )}
    </FieldSet>
  );
}

function OptionText({ name, priceDelta, soldOut }: { name: string; priceDelta: number; soldOut: boolean }) {
  return (
    <FieldContent className="flex-1 flex-row items-center justify-between gap-3">
      <span className="min-w-0 break-words">{name}</span>
      {soldOut ? (
        <span className="shrink-0 text-sm text-muted-foreground">{shared.product.soldOut}</span>
      ) : priceDelta > 0 ? (
        <span className="shrink-0 text-sm text-muted-foreground">+{formatPeso(priceDelta)}</span>
      ) : null}
    </FieldContent>
  );
}

function ItemPhotosCarousel({ photos, name }: { photos: readonly string[]; name: string }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  if (photos.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {photos.map((url, index) => (
            <CarouselItem key={index}>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-shop-30">
                <img
                  src={url}
                  alt={`${name} photo ${String(index + 1)}`}
                  className="size-full object-cover"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {photos.length > 1 && (
        <>
          {/* Mobile dots */}
          <div className="flex items-center justify-center gap-1.5 py-1 sm:hidden">
            {photos.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Go to slide ${String(index + 1)}`}
                onClick={() => {
                  api?.scrollTo(index);
                }}
                className={cn(
                  'h-2 rounded-full transition-all',
                  current === index ? 'w-5 bg-shop-10' : 'w-2 bg-shop-30-foreground/20',
                )}
              />
            ))}
          </div>

          {/* Desktop thumbnails */}
          <div className="hidden sm:flex items-center gap-2 overflow-x-auto py-1">
            {photos.map((url, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Thumbnail ${String(index + 1)}`}
                onClick={() => {
                  api?.scrollTo(index);
                }}
                className={cn(
                  'relative size-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all outline-none',
                  current === index
                    ? 'border-shop-10 ring-2 ring-shop-10/30'
                    : 'border-transparent opacity-65 hover:opacity-100',
                )}
              >
                <img src={url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** The choices for one item; a new one per item, so nothing carries over. */
function ItemForm({ item, onDone }: { item: StorefrontItem; onDone: () => void }) {
  const { media, block, addLine } = useShop();
  const [only] = item.variants;
  const [variantId, setVariantId] = useState<string | null>(
    item.variants.length === 1 && only && variantAvailable(item, only) ? only.id : null,
  );
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [qty, setQty] = useState(1);

  const variant = item.variants.find((candidate) => candidate.id === variantId) ?? null;
  const cheapest = item.variants.reduce((low, candidate) => (candidate.price < low.price ? candidate : low));
  const options = item.optionGroups.flatMap((group) => group.options).filter((option) => optionIds.includes(option.id));
  const total = unitPrice(variant ?? cheapest, options) * qty;
  const problem = choiceProblem(item, variantId, optionIds);
  const photos = item.photos.flatMap((photo) => {
    const urls = media[photo.path];
    return urls ? [urls.full] : [];
  });

  const label = block
    ? block.short
    : problem?.kind === 'variant'
      ? words.chooseSize
      : problem
        ? words.choose(problem.name)
        : words.add(formatPeso(total));

  const add = () => {
    if (block) return;
    if (problem) {
      const target = problem.kind === 'variant' ? choiceId(item.id, 'variant') : choiceId(item.id, problem.groupId);
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!variant) return;
    const trimmed = note.trim();
    addLine({ itemId: item.id, variantId: variant.id, optionIds, qty, note: trimmed === '' ? null : trimmed }, item.name);
    onDone();
  };

  return (
    <>
      <ItemPhotosCarousel photos={photos} name={item.name} />
      <ResponsiveDialogHeader className="px-0 text-left">
        <ResponsiveDialogTitle className="text-xl break-words">{item.name}</ResponsiveDialogTitle>
        {item.description ? (
          <ResponsiveDialogDescription className="break-words whitespace-pre-line">{item.description}</ResponsiveDialogDescription>
        ) : null}
      </ResponsiveDialogHeader>

      <div className="flex flex-col gap-6 pb-4">
        <FieldSet id={choiceId(item.id, 'variant')} className="scroll-mt-4">
          <FieldLegend className="flex w-full items-center justify-between gap-2">
            <span>{words.size}</span>
            {item.variants.length > 1 && <Badge className={REQUIRED}>{words.required}</Badge>}
          </FieldLegend>
          <RadioGroup
            value={variantId}
            onValueChange={(value) => {
              const picked = item.variants.find((candidate) => candidate.id === value);
              if (picked) setVariantId(picked.id);
            }}
          >
            {item.variants.map((candidate) => {
              const available = variantAvailable(item, candidate);
              return (
                <FieldLabel key={candidate.id} htmlFor={`variant-${candidate.id}`} className={CHOICE_ROW}>
                  <RadioGroupItem id={`variant-${candidate.id}`} value={candidate.id} disabled={!available} className={PICKED} />
                  <FieldContent className="flex-1 flex-row items-center justify-between gap-3">
                    <span className="min-w-0 break-words">{candidate.name}</span>
                    {available ? (
                      <Money amount={candidate.price} className="shrink-0 font-semibold" />
                    ) : (
                      <span className="shrink-0 text-sm text-muted-foreground">{shared.product.soldOut}</span>
                    )}
                  </FieldContent>
                </FieldLabel>
              );
            })}
          </RadioGroup>
        </FieldSet>

        {item.optionGroups.map((group) => (
          <OptionGroupField
            key={group.id}
            item={item}
            group={group}
            chosen={optionIds}
            onChange={(ids) => {
              const others = optionIds.filter((id) => !group.options.some((option) => option.id === id));
              setOptionIds([...others, ...ids]);
            }}
          />
        ))}

        <Field>
          <FieldLabel htmlFor={`note-${item.id}`}>{words.note}</FieldLabel>
          <Textarea
            id={`note-${item.id}`}
            value={note}
            maxLength={CART_NOTE_MAX}
            rows={2}
            placeholder={words.notePlaceholder}
            onChange={(event) => {
              setNote(event.target.value);
            }}
          />
        </Field>
      </div>

      <StickyActionBar className="-mx-4 sm:-mx-4">
        <QuantityStepper value={qty} onChange={setQty} words={shared} />
        <Button
          size="lg"
          className={cn('min-w-0 flex-1 bg-shop-10 text-shop-10-foreground hover:bg-shop-10/90 active:bg-shop-10/80')}
          disabled={block !== null}
          onClick={add}
        >
          <span className="truncate">{label}</span>
        </Button>
      </StickyActionBar>
    </>
  );
}

/** The item sheet: photos, size, add-ons, note, quantity and "Add · ₱150". */
export function ItemSheet({ item, open, onOpenChange }: { item: StorefrontItem | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <ResponsiveDialog open={open && item !== null} onOpenChange={onOpenChange} breakpoint={1024}>
      <ResponsiveDialogContent className="gap-4 px-4 pb-0 sm:max-w-lg">
        {item ? (
          <ItemForm
            key={item.id}
            item={item}
            onDone={() => {
              onOpenChange(false);
            }}
          />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
