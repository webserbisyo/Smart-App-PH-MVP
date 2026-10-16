import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';

import {
  mediaUrl,
  removeShopMedia,
  useApiClient,
  useShopSettings,
  useUpdateShopName,
  useUpdateShopSettings,
} from '@smartapp/api';
import { shopPalette, WORDS } from '@smartapp/core';
import type { ShopSettings, Tenant } from '@smartapp/core';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Textarea } from '@smartapp/ui/components/textarea';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { cn } from '@smartapp/ui/lib/utils';
import { BannerField } from '@smartapp/ui/patterns/BannerField';
import { BrandCard } from '@smartapp/ui/patterns/BrandCard';
import { BrandColorField } from '@smartapp/ui/patterns/BrandColorField';
import { CategoryIcon } from '@smartapp/ui/patterns/CategoryIcon';
import { LogoField } from '@smartapp/ui/patterns/LogoField';
import { ProductCard } from '@smartapp/ui/patterns/ProductCard';
import { RewardCard } from '@smartapp/ui/patterns/RewardCard';
import { ShopTheme } from '@smartapp/ui/shop-theme';

import { useMediaUpload } from '../../../app/media';
import { useShop } from '../../../app/shop';
import { SettingsForm, SettingsLoader } from '../components/SettingsPage';
import { LookForm, lookFromShop, lookPatch } from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.look;

function noop() {
  // Preview click actions
}

/**
 * Live phone preview using storefront v2 patterns:
 * BrandCard / cover, RewardCard, category chips, ProductCard, and floating tab dock.
 */
function Preview({ control }: { control: Control<LookForm> }) {
  const [name, tagline, logoPath, coverPath, primary, secondary, accent] = useWatch({
    control,
    name: ['name', 'tagline', 'logoPath', 'coverPath', 'primary', 'secondary', 'accent'],
  });
  const shopName = name.trim() === '' ? WORDS.dashboard.shell.shopPlaceholder : name;
  const logoUrl = logoPath ? mediaUrl(logoPath, 'thumb') : null;
  const bannerUrl = coverPath ? mediaUrl(coverPath, 'full') : null;

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{words.preview}</span>
      <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-[2.25rem] border-[6px] border-foreground/80 bg-background shadow-2xl">
        <ShopTheme colors={{ primary, secondary, accent }} className="flex min-h-[560px] flex-col bg-shop-60 text-foreground">
          {/* Storefront v2 Top Bar */}
          <div className="flex h-12 items-center justify-between border-b border-border/40 bg-shop-30/95 px-4 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="size-6 rounded-md object-cover" />
              ) : (
                <div className="flex size-6 items-center justify-center rounded-md bg-shop-10 text-[10px] font-bold text-shop-10-foreground">
                  {shopName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="max-w-[120px] truncate text-xs font-bold">{shopName}</span>
            </div>
            <span className="rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success-text">
              Open
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3">
            {/* Storefront v2 Brand Card or Cover Banner */}
            {bannerUrl ? (
              <div className="overflow-hidden rounded-[var(--radius-card,1.25rem)] border border-border/40 shadow-xs">
                <img src={bannerUrl} alt="" className="aspect-[21/9] w-full object-cover" />
              </div>
            ) : (
              <BrandCard
                name={shopName}
                tagline={tagline.trim() === '' ? words.previewTagline : tagline}
                logoUrl={logoUrl}
              />
            )}

            {/* Storefront v2 Reward Card */}
            <RewardCard
              stamps={3}
              goal={10}
              reward="Free Drink or Meal"
              logoUrl={logoUrl}
              shopName={shopName}
              signedIn={true}
              celebrate={false}
            />

            {/* Category Chips */}
            <div className="flex gap-1.5 overflow-hidden pt-1">
              {['Menu', 'Best Sellers', 'Specials'].map((chip, index) => (
                <span
                  key={chip}
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
                    index === 0
                      ? 'bg-shop-10 text-shop-10-foreground'
                      : 'border border-border/40 bg-shop-30 text-shop-30-foreground',
                  )}
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Sample Product */}
            <div className="grid grid-cols-2 gap-2">
              <ProductCard
                name={words.previewProduct}
                photoUrl={null}
                fallbackIcon={<CategoryIcon icon={{ kind: 'fluent', key: 'shopping-bags' }} className="size-10" />}
                price={12_000}
                words={WORDS.shared.product}
                onOpen={noop}
                onAdd={noop}
              />
            </div>
          </div>

          {/* Floating Pill Dock preview */}
          <div className="p-3 pt-0">
            <div className="flex h-11 items-center justify-around rounded-full border border-border/40 bg-shop-30/95 px-3 text-xs shadow-md backdrop-blur-xs">
              <span className="font-semibold text-shop-10">Home</span>
              <span className="text-muted-foreground">Menu</span>
              <span className="text-muted-foreground">Rewards</span>
              <span className="text-muted-foreground">Orders</span>
            </div>
          </div>
        </ShopTheme>
      </div>
    </div>
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
  const [logoPath, primary, secondary, accent] = useWatch({
    control: form.control,
    name: ['logoPath', 'primary', 'secondary', 'accent'],
  });
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
          {/* Logo Field & Banner Field */}
          <div className="flex flex-col gap-5">
            <Controller
              control={form.control}
              name="logoPath"
              render={({ field }) => (
                <LogoField
                  label={words.logo}
                  value={field.value ? mediaUrl(field.value, 'thumb') : null}
                  upload={uploadLogo}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              )}
            />

            <Controller
              control={form.control}
              name="coverPath"
              render={({ field }) => (
                <BannerField
                  label={words.cover}
                  value={field.value ? mediaUrl(field.value, 'full') : null}
                  upload={uploadCover}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              )}
            />
          </div>

          {/* Shop Name & Tagline */}
          <Field data-invalid={errors.name !== undefined || undefined}>
            <FieldLabel htmlFor="look-name">{words.name}</FieldLabel>
            <Input
              id="look-name"
              maxLength={80}
              autoComplete="organization"
              aria-invalid={errors.name !== undefined}
              disabled={disabled}
              {...form.register('name')}
            />
            {errors.name ? <FieldError>{WORDS.dashboard.products.editor.errors.name}</FieldError> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="look-tagline">{words.tagline}</FieldLabel>
            <Textarea id="look-tagline" maxLength={160} rows={2} disabled={disabled} {...form.register('tagline')} />
            <FieldDescription>{words.taglineHint}</FieldDescription>
          </Field>

          {/* Brand Color Field (one color + presets + logo color extraction + 60/30/10 preview + advanced 3-color mode) */}
          <BrandColorField
            primary={primary}
            secondary={secondary}
            accent={accent}
            logoUrl={logoPath ? mediaUrl(logoPath, 'thumb') : null}
            onChangeOne={(brandHex) => {
              const palette = shopPalette(brandHex);
              form.setValue('primary', palette.primary, { shouldDirty: true });
              form.setValue('secondary', palette.secondary, { shouldDirty: true });
              form.setValue('accent', palette.accent, { shouldDirty: true });
            }}
            onChangePart={(part, hex) => {
              form.setValue(part, hex, { shouldDirty: true });
            }}
            disabled={disabled}
          />
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
