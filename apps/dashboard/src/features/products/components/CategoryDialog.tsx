import { useState } from 'react';

import { mediaUrl, useRemoveCategory, useSaveCategory } from '@smartapp/api';
import { errorWords, WORDS } from '@smartapp/core';
import type { Category, CategoryIcon as CategoryIconValue } from '@smartapp/core';
import { FLUENT_ICONS, searchFluentIcons } from '@smartapp/ui/assets/fluent';
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
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { Spinner } from '@smartapp/ui/components/spinner';
import { Switch } from '@smartapp/ui/components/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { toast } from '@smartapp/ui/components/sonner';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IMAGE_SIZES } from '@smartapp/ui/lib/compress-image';
import { cn } from '@smartapp/ui/lib/utils';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';
import { PhotoField } from '@smartapp/ui/patterns/PhotoField';

import { useVocab } from '../../../app/shop';
import { lastEmoji } from '../emoji';
import { useMediaUpload } from '../../../app/media';

const words = WORDS.dashboard.products.category;
const shared = WORDS.shared;

type IconTab = 'icons' | 'emoji' | 'photo';

function tabFor(icon: CategoryIconValue | null): IconTab {
  if (icon?.kind === 'emoji') return 'emoji';
  if (icon?.kind === 'image') return 'photo';
  return 'icons';
}

function IconGrid({ value, onChange }: { value: CategoryIconValue | null; onChange: (icon: CategoryIconValue) => void }) {
  const [query, setQuery] = useState('');
  const keys = searchFluentIcons(query);
  return (
    <div className="flex flex-col gap-3">
      <Input
        type="search"
        aria-label={words.searchIcons}
        placeholder={words.searchIcons}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
      />
      {keys.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{words.noIcons}</p>
      ) : (
        <div className="grid max-h-64 grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1 overflow-y-auto p-0.5">
          {keys.map((key) => {
            const selected = value?.kind === 'fluent' && value.key === key;
            return (
              <button
                key={key}
                type="button"
                aria-label={FLUENT_ICONS[key].name}
                aria-pressed={selected}
                title={FLUENT_ICONS[key].name}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                  selected && 'bg-primary/10 ring-2 ring-primary',
                )}
                onClick={() => {
                  onChange({ kind: 'fluent', key });
                }}
              >
                <CategoryIcon icon={{ kind: 'fluent', key }} className="size-9" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryForm({ category, onDone }: { category: Category | null; onDone: (saved: Category | null) => void }) {
  const vocab = useVocab();
  const online = useOnline();
  const save = useSaveCategory();
  const remove = useRemoveCategory();
  const upload = useMediaUpload('category');
  const [name, setName] = useState(category?.name ?? '');
  const [isHidden, setIsHidden] = useState(category?.isHidden ?? false);
  const [icon, setIcon] = useState<CategoryIconValue | null>(category?.icon ?? null);
  const [tab, setTab] = useState<IconTab>(tabFor(category?.icon ?? null));
  const [emojiText, setEmojiText] = useState(category?.icon?.kind === 'emoji' ? category.icon.value : '');
  const [nameMissing, setNameMissing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const error = save.error ?? remove.error;

  const submit = () => {
    if (name.trim() === '') {
      setNameMissing(true);
      return;
    }
    save.mutate(
      { id: category?.id ?? null, name: name.trim(), isHidden, icon },
      {
        onSuccess: (saved) => {
          toast.success(words.saved);
          onDone(saved);
        },
      },
    );
  };

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{category ? words.edit : words.add}</ResponsiveDialogTitle>
      </ResponsiveDialogHeader>
      <FieldGroup className="px-4 pb-2 sm:px-0">
        <Field data-invalid={nameMissing || undefined}>
          <FieldLabel htmlFor="category-name">{words.name}</FieldLabel>
          <Input
            id="category-name"
            value={name}
            maxLength={60}
            placeholder={words.namePlaceholder}
            aria-invalid={nameMissing}
            onChange={(event) => {
              setName(event.target.value);
              setNameMissing(false);
            }}
          />
          {nameMissing ? <FieldError>{WORDS.dashboard.products.editor.errors.name}</FieldError> : null}
        </Field>

        <Field>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>{words.icon}</FieldLabel>
            <div className="flex items-center gap-2">
              <CategoryIcon icon={icon} imageUrl={(path) => mediaUrl(path, 'thumb')} className="size-8" />
              {icon ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIcon(null);
                    setEmojiText('');
                  }}
                >
                  {words.noIcon}
                </Button>
              ) : null}
            </div>
          </div>
          <Tabs
            value={tab}
            onValueChange={(value: IconTab) => {
              setTab(value);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="icons">{words.icons}</TabsTrigger>
              <TabsTrigger value="emoji">{words.emoji}</TabsTrigger>
              <TabsTrigger value="photo">{words.photo}</TabsTrigger>
            </TabsList>
            <TabsContent value="icons">
              <IconGrid value={icon} onChange={setIcon} />
            </TabsContent>
            <TabsContent value="emoji">
              <Field>
                <FieldLabel htmlFor="category-emoji" className="sr-only">
                  {words.emojiLabel}
                </FieldLabel>
                <Input
                  id="category-emoji"
                  value={emojiText}
                  placeholder="☕"
                  autoComplete="off"
                  className="w-24 text-center text-2xl"
                  onChange={(event) => {
                    const emoji = lastEmoji(event.target.value);
                    setEmojiText(emoji ?? '');
                    setIcon(emoji ? { kind: 'emoji', value: emoji } : null);
                  }}
                />
                <FieldDescription>{words.emojiHint}</FieldDescription>
              </Field>
            </TabsContent>
            <TabsContent value="photo">
              <PhotoField
                label={words.photoLabel}
                value={icon?.kind === 'image' ? mediaUrl(icon.path, 'full') : null}
                upload={upload}
                onChange={(path) => {
                  setIcon(path ? { kind: 'image', path } : null);
                }}
                compress={IMAGE_SIZES.logo}
                words={shared.photo}
                disabled={!online}
              />
            </TabsContent>
          </Tabs>
        </Field>

        <Field orientation="horizontal" className="justify-between">
          <div className="flex flex-col gap-0.5">
            <FieldLabel htmlFor="category-hidden">{words.hiddenLabel}</FieldLabel>
            <FieldDescription>{words.hiddenHint}</FieldDescription>
          </div>
          <Switch id="category-hidden" checked={isHidden} onCheckedChange={setIsHidden} />
        </Field>

        {error ? <FieldError>{errorWords(error.code, vocab)}</FieldError> : null}
      </FieldGroup>

      <ResponsiveDialogFooter className="flex-row flex-wrap justify-between gap-2">
        {category ? (
          <Button
            variant="ghost"
            className="text-destructive-text"
            disabled={!online || remove.isPending}
            onClick={() => {
              setConfirmDelete(true);
            }}
          >
            {words.delete}
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" disabled={!online || save.isPending}>
          {save.isPending ? <Spinner /> : null}
          {shared.save}
        </Button>
      </ResponsiveDialogFooter>

      {category ? (
        <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{words.deleteConfirm(category.name)}</AlertDialogTitle>
              <AlertDialogDescription>{words.deleteText}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{WORDS.dashboard.products.editor.cancel}</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setConfirmDelete(false);
                  remove.mutate(
                    { categoryId: category.id },
                    {
                      onSuccess: () => {
                        toast.success(words.deleted);
                        onDone(null);
                      },
                    },
                  );
                }}
              >
                {WORDS.dashboard.products.editor.delete}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </form>
  );
}

export interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The category to edit, or `null` to add one. */
  category: Category | null;
  /** Change it each time the dialog opens, so the form starts fresh (it stays mounted while closing). */
  formKey: number;
  /** After a save (with the saved category) or a delete (`null`). */
  onDone?: (saved: Category | null) => void;
}

/** Add or edit a category: name, icon (Fluent, emoji or photo) and hidden; delete only when it is empty. */
export function CategoryDialog({ open, onOpenChange, category, formKey, onDone }: CategoryDialogProps) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="sm:max-w-lg">
        <CategoryForm
          key={formKey}
          category={category}
          onDone={(saved) => {
            onOpenChange(false);
            onDone?.(saved);
          }}
        />
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
