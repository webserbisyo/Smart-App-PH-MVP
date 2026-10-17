import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';

import { mediaUrl, useCatalog, useSaveStampRule, useShopSettings, useStampRule, useUpdateShopSettings } from '@smartapp/api';
import { formatPeso, RewardKind, rewardLabel, WORDS } from '@smartapp/core';
import type { CatalogItem, RewardRule, ShopSettings, StampRule } from '@smartapp/core';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { Switch } from '@smartapp/ui/components/switch';
import { Tabs, TabsList, TabsTrigger } from '@smartapp/ui/components/tabs';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IMAGE_SIZES } from '@smartapp/ui/lib/compress-image';
import { PesoField } from '@smartapp/ui/patterns/PesoField';
import { PhotoField } from '@smartapp/ui/patterns/PhotoField';
import { RewardCard } from '@smartapp/ui/patterns/RewardCard';

import { useMediaUpload } from '../../../app/media';
import { useShop } from '../../../app/shop';
import { SettingsForm, SettingsLoader } from '../components/SettingsPage';
import { stampRuleFromForm, StampsForm, stampsFromData } from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.stamps;
/** Every new member starts with 1 welcome stamp (decision P4-F4), so the preview does too. */
const WELCOME_STAMPS = 1;

function SwitchRow({
  control,
  name,
  label,
  hint,
  disabled,
}: {
  control: Control<StampsForm>;
  name: 'isActive' | 'showMemberCount';
  label: string;
  hint: string;
  disabled: boolean;
}) {
  const id = `stamps-${name}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field orientation="horizontal" className="justify-between gap-4 py-3">
          <div className="flex flex-col gap-0.5">
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <FieldDescription>{hint}</FieldDescription>
          </div>
          <Switch id={id} checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
        </Field>
      )}
    />
  );
}

function StampsEditor({
  rule,
  settings,
  catalog,
}: {
  rule: StampRule | RewardRule;
  settings: ShopSettings;
  catalog: readonly CatalogItem[];
}) {
  const online = useOnline();
  const shop = useShop();
  const saveRule = useSaveStampRule();
  const updateSettings = useUpdateShopSettings();
  const upload = useMediaUpload('item');
  const { saving, error, run } = useSaveRunner();
  const form = useForm<StampsForm>({
    resolver: zodResolver(StampsForm),
    defaultValues: stampsFromData(rule, settings),
  });
  const { errors, isDirty } = form.formState;

  const [
    stampsText,
    rewardKind,
    rewardAmount,
    rewardItemId,
    rewardVariantId,
    rewardTitle,
    rewardImagePath,
  ] = useWatch({
    control: form.control,
    name: [
      'stampsNeeded',
      'rewardKind',
      'rewardAmount',
      'rewardItemId',
      'rewardVariantId',
      'rewardTitle',
      'rewardImagePath',
    ],
  });

  const disabled = saving || !online;
  const typed = Number(stampsText);
  const goal = Number.isInteger(typed) && typed >= 1 && typed <= 50 ? typed : rule.stampsNeeded;

  const selectedItem = catalog.find((item) => item.id === rewardItemId);
  const variants = selectedItem?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === rewardVariantId);

  let previewLabel = '';
  let previewImageUrl: string | null = null;

  if (rewardKind === 'discount') {
    previewLabel = rewardLabel(rewardAmount ?? ('rewardAmount' in rule ? rule.rewardAmount : 10000));
  } else if (rewardKind === 'free_item') {
    if (selectedItem && selectedVariant) {
      const isOnlyVariant =
        variants.length === 1 || selectedVariant.name === 'Standard' || selectedVariant.name === 'Default';
      previewLabel = isOnlyVariant ? `Free ${selectedItem.name}` : `Free ${selectedItem.name} (${selectedVariant.name})`;
    } else if (selectedItem) {
      previewLabel = `Free ${selectedItem.name}`;
    } else {
      previewLabel = 'Free item';
    }
    const photo = selectedItem?.photos[0]?.path ?? null;
    if (photo) {
      previewImageUrl = mediaUrl(photo, 'thumb');
    }
  } else {
    previewLabel = rewardTitle.trim() || 'Prize';
    if (rewardImagePath) {
      previewImageUrl = mediaUrl(rewardImagePath, 'thumb');
    }
  }

  const save = (values: StampsForm) =>
    run(async () => {
      const saved = await saveRule.mutateAsync(stampRuleFromForm(rule.tenantId, values, catalog));
      const nextSettings =
        values.showMemberCount === settings.showMemberCount
          ? settings
          : await updateSettings.mutateAsync({ showMemberCount: values.showMemberCount });
      form.reset(stampsFromData(saved, nextSettings));
    });

  return (
    <SettingsForm
      title={WORDS.dashboard.settings.sections.stamps}
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
        <div className="flex flex-col divide-y">
          <SwitchRow control={form.control} name="isActive" label={words.active} hint={words.activeHint} disabled={disabled} />
          <SwitchRow
            control={form.control}
            name="showMemberCount"
            label={words.memberCount}
            hint={words.memberCountHint}
            disabled={disabled}
          />
        </div>

        <Field>
          <FieldLabel>{words.rewardKind}</FieldLabel>
          <Tabs
            value={rewardKind}
            onValueChange={(val) => {
              const parsed = RewardKind.safeParse(val);
              if (parsed.success) {
                form.setValue('rewardKind', parsed.data, { shouldDirty: true });
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="discount">{words.kindDiscount}</TabsTrigger>
              <TabsTrigger value="free_item">{words.kindFreeItem}</TabsTrigger>
              <TabsTrigger value="custom">{words.kindCustom}</TabsTrigger>
            </TabsList>
          </Tabs>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors.stampsNeeded !== undefined || undefined}>
            <FieldLabel htmlFor="stamps-needed">{words.stampsNeeded}</FieldLabel>
            <Input
              id="stamps-needed"
              inputMode="numeric"
              autoComplete="off"
              maxLength={2}
              className="tabular"
              aria-invalid={errors.stampsNeeded !== undefined}
              disabled={disabled}
              {...form.register('stampsNeeded')}
            />
            {errors.stampsNeeded?.message ? (
              <FieldError>{errors.stampsNeeded.message}</FieldError>
            ) : (
              <FieldDescription>{words.stampsNeededHint}</FieldDescription>
            )}
          </Field>

          <Controller
            control={form.control}
            name="minOrderTotal"
            render={({ field }) => (
              <PesoField
                label={words.minimum}
                description={words.minimumHint}
                value={field.value}
                onChange={field.onChange}
                words={WORDS.shared}
                disabled={disabled}
                name={field.name}
              />
            )}
          />
        </div>

        {rewardKind === 'discount' && (
          <Controller
            control={form.control}
            name="rewardAmount"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <PesoField
                  label={words.reward}
                  description={words.rewardHint}
                  value={field.value}
                  onChange={field.onChange}
                  words={WORDS.shared}
                  disabled={disabled}
                  name={field.name}
                />
                {fieldState.error?.message ? <FieldError>{fieldState.error.message}</FieldError> : null}
              </div>
            )}
          />
        )}

        {rewardKind === 'free_item' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={errors.rewardItemId !== undefined || undefined}>
              <FieldLabel htmlFor="reward-item">{words.rewardItem}</FieldLabel>
              <NativeSelect
                id="reward-item"
                value={rewardItemId ?? ''}
                onChange={(e) => {
                  const itemId = e.target.value === '' ? null : e.target.value;
                  form.setValue('rewardItemId', itemId, { shouldDirty: true });
                  const item = catalog.find((i) => i.id === itemId);
                  const firstVariant = item?.variants[0]?.id ?? null;
                  form.setValue('rewardVariantId', firstVariant, { shouldDirty: true });
                  if (item?.variants[0]) {
                    form.setValue('rewardAmount', item.variants[0].price, { shouldDirty: true });
                  }
                }}
                disabled={disabled}
                className="w-full"
              >
                <NativeSelectOption value="">{words.rewardItemSelect}</NativeSelectOption>
                {catalog.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {item.name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {errors.rewardItemId?.message && <FieldError>{errors.rewardItemId.message}</FieldError>}
            </Field>

            {selectedItem && variants.length > 0 && (
              <Field data-invalid={errors.rewardVariantId !== undefined || undefined}>
                <FieldLabel htmlFor="reward-variant">{words.rewardVariant}</FieldLabel>
                <NativeSelect
                  id="reward-variant"
                  value={rewardVariantId ?? ''}
                  onChange={(e) => {
                    const variantId = e.target.value === '' ? null : e.target.value;
                    form.setValue('rewardVariantId', variantId, { shouldDirty: true });
                    const v = variants.find((variant) => variant.id === variantId);
                    if (v) {
                      form.setValue('rewardAmount', v.price, { shouldDirty: true });
                    }
                  }}
                  disabled={disabled}
                  className="w-full"
                >
                  <NativeSelectOption value="">{words.rewardVariantSelect}</NativeSelectOption>
                  {variants.map((v) => (
                    <NativeSelectOption key={v.id} value={v.id}>
                      {v.name} ({formatPeso(v.price)})
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {errors.rewardVariantId?.message && <FieldError>{errors.rewardVariantId.message}</FieldError>}
              </Field>
            )}
          </div>
        )}

        {rewardKind === 'custom' && (
          <div className="flex flex-col gap-4">
            <Field data-invalid={errors.rewardTitle !== undefined || undefined}>
              <FieldLabel htmlFor="reward-title">{words.rewardTitle}</FieldLabel>
              <Input
                id="reward-title"
                maxLength={60}
                placeholder={words.rewardTitleHint}
                disabled={disabled}
                {...form.register('rewardTitle')}
              />
              {errors.rewardTitle?.message ? (
                <FieldError>{errors.rewardTitle.message}</FieldError>
              ) : (
                <FieldDescription>{words.rewardTitleHint}</FieldDescription>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="reward-description">{words.rewardDescription}</FieldLabel>
              <Input
                id="reward-description"
                maxLength={200}
                placeholder={words.rewardDescriptionHint}
                disabled={disabled}
                {...form.register('rewardDescription')}
              />
            </Field>

            <Controller
              control={form.control}
              name="rewardImagePath"
              render={({ field }) => (
                <PhotoField
                  label={words.rewardPhoto}
                  value={field.value ? mediaUrl(field.value, 'full') : null}
                  upload={upload}
                  onChange={field.onChange}
                  compress={IMAGE_SIZES.thumb}
                  words={WORDS.shared.photo}
                  disabled={disabled}
                />
              )}
            />
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <span className="text-sm font-medium">{words.preview}</span>
          <RewardCard
            stamps={WELCOME_STAMPS}
            goal={goal}
            reward={previewLabel}
            rewardImageUrl={previewImageUrl}
            shopName={shop.name}
            logoUrl={settings.logoPath ? mediaUrl(settings.logoPath, 'thumb') : null}
            signedIn={true}
            celebrate={false}
            className="max-w-sm"
          />
          <FieldDescription>{words.previewHint}</FieldDescription>
        </div>
      </FieldGroup>
    </SettingsForm>
  );
}

/** The stamp card: on or off, stamps for a reward, the minimum order, the reward, and the members count switch. */
export default function StampsScreen() {
  const shop = useShop();
  const rule = useStampRule(shop.id);
  const settings = useShopSettings(shop.id);
  const catalog = useCatalog(shop.id);
  return (
    <SettingsLoader queries={[rule, settings, catalog]}>
      {() =>
        rule.data && settings.data && catalog.data ? (
          <StampsEditor rule={rule.data} settings={settings.data} catalog={catalog.data} />
        ) : null
      }
    </SettingsLoader>
  );
}
