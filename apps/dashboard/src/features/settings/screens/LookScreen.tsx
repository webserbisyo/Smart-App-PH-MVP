import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';

import { mediaUrl, removeShopMedia, useApiClient, useShopSettings, useUpdateShopName, useUpdateShopSettings } from '@smartapp/api';
import { THEME_PRESET_KEYS, THEME_PRESETS, themeContrastIssues, WORDS } from '@smartapp/core';
import type { ShopSettings, Tenant } from '@smartapp/core';
import { Alert, AlertDescription, AlertTitle } from '@smartapp/ui/components/alert';
import { Button } from '@smartapp/ui/components/button';
import {
  ColorPicker,
  ColorPickerArea,
  ColorPickerContent,
  ColorPickerHueSlider,
  ColorPickerInput,
  ColorPickerSwatch,
  ColorPickerTrigger,
} from '@smartapp/ui/components/color-picker';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Textarea } from '@smartapp/ui/components/textarea';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconAlertTriangle } from '@smartapp/ui/icons';
import { IMAGE_SIZES } from '@smartapp/ui/lib/compress-image';
import { cn } from '@smartapp/ui/lib/utils';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';
import { PhotoField } from '@smartapp/ui/patterns/PhotoField';
import { ProductCard } from '@smartapp/ui/patterns/ProductCard';
import { ShopHeader } from '@smartapp/ui/patterns/ShopHeader';
import { ShopTheme } from '@smartapp/ui/shop-theme';

import { useMediaUpload } from '../../../app/media';
import { useShop } from '../../../app/shop';
import { SettingsForm, SettingsLoader } from '../components/SettingsPage';
import { LookForm, lookFromShop, lookPatch } from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.look;
const COLOR_FIELDS = [
  { name: 'primary', label: words.background },
  { name: 'secondary', label: words.cards },
  { name: 'accent', label: words.buttons },
] as const;

/**
 * One colour with its picker. Changes count only while the picker is open: the picker also reports a slightly
 * rounded colour whenever its value is set from outside (a ready-made set), which would undo the preset.
 */
function ColorField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <ColorPicker
        value={value}
        open={open}
        onOpenChange={setOpen}
        onValueChange={(next) => {
          if (open && /^#[0-9a-fA-F]{6}$/.test(next) && next.toUpperCase() !== value) onChange(next.toUpperCase());
        }}
      >
        <ColorPickerTrigger disabled={disabled} render={<Button variant="outline" className="justify-start gap-2" aria-label={words.pick(label)} />}>
          <ColorPickerSwatch className="size-5 rounded-md" />
          <span className="tabular">{value}</span>
        </ColorPickerTrigger>
        <ColorPickerContent>
          <ColorPickerArea />
          <ColorPickerHueSlider />
          <ColorPickerInput />
        </ColorPickerContent>
      </ColorPicker>
    </div>
  );
}

function noop() {
  // The preview's buttons do nothing.
}

/** A small storefront: header, category chips and one product card in the chosen colours. */
function Preview({ control }: { control: Control<LookForm> }) {
  const [name, tagline, logoPath, coverPath, primary, secondary, accent] = useWatch({
    control,
    name: ['name', 'tagline', 'logoPath', 'coverPath', 'primary', 'secondary', 'accent'],
  });
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{words.preview}</span>
      <div className="mx-auto w-full max-w-80 overflow-hidden rounded-[1.75rem] border-4 border-foreground/80 shadow-lg">
        <ShopTheme colors={{ primary, secondary, accent }} className="min-h-0">
          {coverPath ? <img src={mediaUrl(coverPath, 'thumb')} alt="" className="aspect-[16/7] w-full object-cover" /> : null}
          <ShopHeader
            name={name.trim() === '' ? WORDS.dashboard.shell.shopPlaceholder : name}
            logoUrl={logoPath ? mediaUrl(logoPath, 'thumb') : null}
            tagline={tagline.trim() === '' ? words.previewTagline : tagline}
            status={{ open: true, text: WORDS.shared.shop.openUntil('9:00 PM') }}
          />
          <div className="flex gap-2 overflow-hidden px-4 py-3">
            {words.previewChips.map((chip, index) => (
              <span
                key={chip}
                className={cn(
                  'shrink-0 rounded-full px-3 py-1.5 text-sm font-medium',
                  index === 0 ? 'bg-shop-10 text-shop-10-foreground' : 'bg-shop-30 text-shop-30-foreground',
                )}
              >
                {chip}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            <ProductCard
              name={words.previewProduct}
              photoUrl={null}
              fallbackIcon={<CategoryIcon icon={{ kind: 'fluent', key: 'shopping-bags' }} className="size-14" />}
              price={12_000}
              words={WORDS.shared.product}
              onOpen={noop}
              onAdd={noop}
            />
          </div>
          <div className="px-4 pb-4">
            <span className="flex h-11 items-center justify-center rounded-full bg-shop-10 text-sm font-semibold text-shop-10-foreground">
              {WORDS.storefront.cart.bar(1, '₱120')}
            </span>
          </div>
        </ShopTheme>
      </div>
    </div>
  );
}

function ContrastWarning({ control }: { control: Control<LookForm> }) {
  const [primary, secondary, accent] = useWatch({ control, name: ['primary', 'secondary', 'accent'] });
  const issues = themeContrastIssues({ primary, secondary, accent });
  if (issues.length === 0) return null;
  return (
    <Alert role="status" className="border-warning bg-warning-soft text-warning-soft-foreground">
      <IconAlertTriangle aria-hidden="true" />
      <AlertTitle>{words.contrast.title}</AlertTitle>
      <AlertDescription className="text-warning-soft-foreground">
        <ul className="list-disc pl-4">
          {issues.map((issue) => (
            <li key={issue}>{words.contrast[issue]}</li>
          ))}
        </ul>
        <p>{words.contrast.fix}</p>
      </AlertDescription>
    </Alert>
  );
}

function LookEditor({ shop, settings }: { shop: Tenant; settings: ShopSettings }) {
  const client = useApiClient();
  const online = useOnline();
  const updateName = useUpdateShopName();
  const updateSettings = useUpdateShopSettings();
  const uploadLogo = useMediaUpload('logo');
  const uploadCover = useMediaUpload('cover');
  const { saving, error, run } = useSaveRunner();
  const form = useForm<LookForm>({ resolver: zodResolver(LookForm), defaultValues: lookFromShop(shop, settings) });
  const { errors, isDirty } = form.formState;
  const colors = useWatch({ control: form.control, name: ['primary', 'secondary', 'accent'] });
  const disabled = saving || !online;

  const save = (values: LookForm) =>
    run(async () => {
      const before = form.formState.defaultValues;
      if (values.name.trim() !== shop.name) await updateName.mutateAsync({ name: values.name });
      await updateSettings.mutateAsync(lookPatch(values));
      // Photos that were replaced or removed are no longer used anywhere.
      const unused = [before?.logoPath, before?.coverPath].filter(
        (path): path is string => typeof path === 'string' && path !== values.logoPath && path !== values.coverPath,
      );
      await removeShopMedia(client, unused);
      form.reset(values);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <SettingsForm
        title={WORDS.dashboard.settings.sections.look}
        description={words.description}
        dirty={isDirty}
        saving={saving}
        error={error}
        onSave={() => {
          void form.handleSubmit(save)();
        }}
        leaveWhen={() => form.formState.isDirty}
      >
        <FieldGroup>
          <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            <Controller
              control={form.control}
              name="logoPath"
              render={({ field }) => (
                <PhotoField
                  label={words.logo}
                  value={field.value ? mediaUrl(field.value, 'full') : null}
                  upload={uploadLogo}
                  onChange={field.onChange}
                  compress={IMAGE_SIZES.logo}
                  words={WORDS.shared.photo}
                  disabled={disabled}
                />
              )}
            />
            <Controller
              control={form.control}
              name="coverPath"
              render={({ field }) => (
                <PhotoField
                  label={words.cover}
                  value={field.value ? mediaUrl(field.value, 'full') : null}
                  upload={uploadCover}
                  onChange={field.onChange}
                  compress={IMAGE_SIZES.photo}
                  words={WORDS.shared.photo}
                  shape="wide"
                  disabled={disabled}
                />
              )}
            />
          </div>
          <Field data-invalid={errors.name !== undefined || undefined}>
            <FieldLabel htmlFor="look-name">{words.name}</FieldLabel>
            <Input id="look-name" maxLength={80} autoComplete="organization" aria-invalid={errors.name !== undefined} disabled={disabled} {...form.register('name')} />
            {errors.name ? <FieldError>{WORDS.dashboard.products.editor.errors.name}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor="look-tagline">{words.tagline}</FieldLabel>
            <Textarea id="look-tagline" maxLength={160} rows={2} disabled={disabled} {...form.register('tagline')} />
            <FieldDescription>{words.taglineHint}</FieldDescription>
          </Field>
          <FieldSet>
            <FieldLegend>{words.colors}</FieldLegend>
            <FieldDescription>{words.colorsHint}</FieldDescription>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">{words.presets}</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {THEME_PRESET_KEYS.map((key) => {
                  const preset = THEME_PRESETS[key];
                  const selected = preset.primary === colors[0] && preset.secondary === colors[1] && preset.accent === colors[2];
                  return (
                    <Button
                      key={key}
                      variant="outline"
                      aria-pressed={selected}
                      disabled={disabled}
                      className={cn('h-auto justify-start gap-2 py-2', selected && 'border-primary ring-2 ring-primary/30')}
                      onClick={() => {
                        form.setValue('primary', preset.primary, { shouldDirty: true });
                        form.setValue('secondary', preset.secondary, { shouldDirty: true });
                        form.setValue('accent', preset.accent, { shouldDirty: true });
                      }}
                    >
                      <span aria-hidden="true" className="flex overflow-hidden rounded-md border">
                        <span className="size-5" style={{ background: preset.primary }} />
                        <span className="size-5" style={{ background: preset.secondary }} />
                        <span className="size-5" style={{ background: preset.accent }} />
                      </span>
                      {words.presetNames[key]}
                    </Button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {COLOR_FIELDS.map((part) => (
                <Controller
                  key={part.name}
                  control={form.control}
                  name={part.name}
                  render={({ field }) => <ColorField label={part.label} value={field.value} onChange={field.onChange} disabled={disabled} />}
                />
              ))}
            </div>
            <ContrastWarning control={form.control} />
          </FieldSet>
        </FieldGroup>
      </SettingsForm>
      <div className="lg:sticky lg:top-24">
        <Preview control={form.control} />
      </div>
    </div>
  );
}

/** Logo, cover, name, short description and the 60/30/10 colours, with a live preview. */
export default function LookScreen() {
  const shop = useShop();
  const settings = useShopSettings(shop.id);
  return (
    <SettingsLoader queries={[settings]} size="wide">
      {() => (settings.data ? <LookEditor shop={shop} settings={settings.data} /> : null)}
    </SettingsLoader>
  );
}
