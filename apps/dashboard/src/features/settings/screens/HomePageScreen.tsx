import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import { useState } from 'react';

import {
  mediaUrl,
  uploadShopMedia,
  useApiClient,
  useSaveShopBanners,
  useShopBanners,
  useShopSettings,
  useUpdateShopSettings,
} from '@smartapp/api';
import { extractYoutubeId, WORDS } from '@smartapp/core';
import type { ShopBanner, ShopSettings } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent } from '@smartapp/ui/components/card';
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { NativeSelect } from '@smartapp/ui/components/native-select';
import { Spinner } from '@smartapp/ui/components/spinner';
import { toast } from '@smartapp/ui/components/sonner';
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from '@smartapp/ui/components/sortable';
import { Textarea } from '@smartapp/ui/components/textarea';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import {
  IconBrandYoutube,
  IconGripVertical,
  IconPhoto,
  IconPlus,
  IconTrash,
} from '@smartapp/ui/icons';
import { BannerField } from '@smartapp/ui/patterns/BannerField';

import { row } from '../../../app/form-path';
import { useShop } from '../../../app/shop';
import { SettingsForm, SettingsLoader } from '../components/SettingsPage';
import type {
  BannerItemForm,
} from '../forms';
import {
  HomeForm,
  homeFromSettings,
  homePatch,
} from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.home;
const MAX_BANNERS = 3;

function emptyBanner(sort: number): BannerItemForm {
  return {
    id: null,
    kind: 'image',
    imagePath: null,
    youtubeId: null,
    title: '',
    linkUrl: '',
    sort,
    isActive: true,
  };
}

function BannerSlideEditor({
  index,
  control,
  disabled,
  onRemove,
  tenantId,
}: {
  index: number;
  control: Control<HomeForm>;
  disabled: boolean;
  onRemove: () => void;
  tenantId: string;
}) {
  const client = useApiClient();
  const rowIndex = row(index);
  const kind = useWatch({ control, name: `banners.${rowIndex}.kind` });
  const youtubeId = useWatch({ control, name: `banners.${rowIndex}.youtubeId` });
  const [pasteLinkInput, setPasteLinkInput] = useState('');
  const [importing, setImporting] = useState(false);

  const handleImport = async (onImageImported: (path: string) => void) => {
    const url = pasteLinkInput.trim();
    if (!url.startsWith('http')) return;

    setImporting(true);
    try {
      const { data: auth } = await client.auth.getSession();
      const token = auth.session?.access_token;
      if (!token) {
        toast.error('You must be signed in to import images.');
        return;
      }

      const storefrontUrl = import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:3000';
      const response = await fetch(`${storefrontUrl}/api/media/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url, tenantId }),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const errorSchema = z.object({ error: z.string().optional() });
        const parsedError = errorSchema.safeParse(body);
        const errorMsg = parsedError.success && parsedError.data.error ? parsedError.data.error : `Import failed (${String(response.status)})`;
        throw new Error(errorMsg);
      }

      const resultSchema = z.object({ path: z.string() });
      const parsedResult = resultSchema.safeParse(body);
      if (!parsedResult.success) {
        throw new Error('Import response was invalid.');
      }
      onImageImported(parsedResult.data.path);
      setPasteLinkInput('');
      toast.success(words.importSuccess);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to import image.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="border-border/60 bg-card/60 shadow-xs">
      <CardContent className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <SortableItemHandle
              className="cursor-grab p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing rounded-md hover:bg-muted"
              disabled={disabled}
              aria-label="Drag to reorder slide"
            >
              <IconGripVertical className="size-4" />
            </SortableItemHandle>
            <span className="font-semibold text-sm">Slide {String(index + 1)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name={`banners.${rowIndex}.kind`}
              render={({ field }) => (
                <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange('image');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                      field.value === 'image'
                        ? 'bg-background font-semibold text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <IconPhoto className="size-3.5" />
                    <span>{words.kindPhoto}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      field.onChange('youtube');
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                      field.value === 'youtube'
                        ? 'bg-background font-semibold text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <IconBrandYoutube className="size-3.5" />
                    <span>{words.kindYoutube}</span>
                  </button>
                </div>
              )}
            />

            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onRemove}
              disabled={disabled}
              className="text-destructive hover:bg-destructive/10"
              aria-label={words.remove}
            >
              <IconTrash className="size-4" />
            </Button>
          </div>
        </div>

        {kind === 'image' ? (
          <div className="flex flex-col gap-3">
            <Controller
              control={control}
              name={`banners.${rowIndex}.imagePath`}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <BannerField
                    label={words.banners}
                    value={field.value ? (field.value.startsWith('http') ? field.value : mediaUrl(field.value, 'full')) : null}
                    upload={async (blob) => {
                      const uploaded = await uploadShopMedia(client, tenantId, 'cover', { full: blob, thumb: blob });
                      return uploaded.path;
                    }}
                    onChange={(path) => {
                      field.onChange(path);
                    }}
                    disabled={disabled}
                  />

                  {/* Or paste image link */}
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      placeholder={words.pasteLinkPlaceholder}
                      value={pasteLinkInput}
                      onChange={(e) => {
                        setPasteLinkInput(e.target.value);
                      }}
                      disabled={disabled}
                      className="text-xs h-8"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={disabled || importing || !pasteLinkInput.trim().startsWith('http')}
                      onClick={() => {
                        void handleImport(field.onChange);
                      }}
                      className="gap-1.5"
                    >
                      {importing ? (
                        <>
                          <Spinner className="size-3.5" />
                          <span>{words.importing}</span>
                        </>
                      ) : (
                        words.importLink
                      )}
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Controller
              control={control}
              name={`banners.${rowIndex}.youtubeId`}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor={`banner-yt-${rowIndex}`}>YouTube URL or Video ID</FieldLabel>
                  <div className="flex flex-col gap-2">
                    <Input
                      id={`banner-yt-${rowIndex}`}
                      placeholder={words.youtubePlaceholder}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const parsedId = extractYoutubeId(e.target.value) ?? e.target.value.trim();
                        field.onChange(parsedId);
                      }}
                      disabled={disabled}
                    />
                    <FieldDescription>{words.youtubeHint}</FieldDescription>

                    {youtubeId && /^[A-Za-z0-9_-]{11}$/.test(youtubeId) ? (
                      <div className="relative aspect-[21/9] w-full max-w-sm overflow-hidden rounded-lg bg-black/10 border">
                        <img
                          src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`}
                          alt="YouTube thumbnail preview"
                          className="size-full object-cover"
                        />
                      </div>
                    ) : null}
                  </div>
                </Field>
              )}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t">
          <Controller
            control={control}
            name={`banners.${rowIndex}.title`}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={`banner-title-${rowIndex}`}>{words.title}</FieldLabel>
                <Input
                  id={`banner-title-${rowIndex}`}
                  placeholder={words.titlePlaceholder}
                  maxLength={60}
                  disabled={disabled}
                  {...field}
                />
                {fieldState.error?.message ? <FieldError>{fieldState.error.message}</FieldError> : null}
              </Field>
            )}
          />

          <Controller
            control={control}
            name={`banners.${rowIndex}.linkUrl`}
            render={({ field, fieldState }) => (
              <Field>
                <FieldLabel htmlFor={`banner-link-${rowIndex}`}>{words.linkUrl}</FieldLabel>
                <Input
                  id={`banner-link-${rowIndex}`}
                  placeholder={words.linkUrlPlaceholder}
                  disabled={disabled}
                  {...field}
                  value={field.value ?? ''}
                />
                {fieldState.error?.message ? <FieldError>{fieldState.error.message}</FieldError> : null}
              </Field>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function HomePageEditor({
  settings,
  banners,
}: {
  settings: ShopSettings;
  banners: readonly ShopBanner[];
}) {
  const shop = useShop();
  const online = useOnline();
  const updateSettings = useUpdateShopSettings();
  const saveBannersMutation = useSaveShopBanners();
  const { saving, error, run } = useSaveRunner();

  const form = useForm<HomeForm>({
    resolver: zodResolver(HomeForm),
    defaultValues: homeFromSettings(settings, banners),
  });

  const { isDirty } = form.formState;
  const disabled = saving || !online;

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'banners',
  });

  const save = (values: HomeForm) =>
    run(async () => {
      const savedSettings = await updateSettings.mutateAsync(homePatch(values));
      const bannerDrafts = values.banners.map((b, idx) => ({
        id: b.id,
        kind: b.kind,
        imagePath: b.imagePath,
        youtubeId: b.youtubeId,
        title: b.title.trim() === '' ? 'Banner' : b.title.trim(),
        linkUrl: b.linkUrl?.trim() || null,
        sort: idx,
        isActive: b.isActive,
      }));
      const savedBanners = await saveBannersMutation.mutateAsync(bannerDrafts);
      form.reset(homeFromSettings(savedSettings, savedBanners));
    });

  return (
    <SettingsForm
      title={WORDS.dashboard.settings.sections.home}
      description={words.description}
      dirty={isDirty}
      saving={saving}
      error={error}
      onSave={() => {
        void form.handleSubmit(save)();
      }}
      leaveWhen={() => form.formState.isDirty}
    >
      <FieldGroup className="gap-8">
        {/* Section 1: Promotional Banners */}
        <FieldSet>
          <div className="flex items-center justify-between gap-4">
            <div>
              <FieldLegend>{words.banners}</FieldLegend>
              <FieldDescription>{words.bannersHint}</FieldDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || fields.length >= MAX_BANNERS}
              onClick={() => {
                append(emptyBanner(fields.length));
              }}
            >
              <IconPlus className="size-4" />
              <span>{words.addBanner}</span>
            </Button>
          </div>

          {fields.length > 0 ? (
            <Sortable
              value={fields.map((f) => ({ id: f.id }))}
              getItemValue={(item) => item.id}
              onMove={({ activeIndex, overIndex }) => {
                move(activeIndex, overIndex);
              }}
            >
              <SortableContent className="flex flex-col gap-4">
                {fields.map((field, index) => (
                  <SortableItem key={field.id} value={field.id}>
                    <BannerSlideEditor
                      index={index}
                      control={form.control}
                      disabled={disabled}
                      onRemove={() => {
                        remove(index);
                      }}
                      tenantId={shop.id}
                    />
                  </SortableItem>
                ))}
              </SortableContent>
            </Sortable>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No promotional banners added. The shop home will display the default brand card.
            </div>
          )}
        </FieldSet>

        {/* Section 2: Announcement */}
        <FieldSet className="border-t pt-6">
          <FieldLegend>{words.announcement}</FieldLegend>
          <FieldDescription>{words.announcementHint}</FieldDescription>

          <Field>
            <FieldLabel htmlFor="announcement-text">{words.announcementText}</FieldLabel>
            <Input
              id="announcement-text"
              placeholder={words.announcementPlaceholder}
              maxLength={160}
              disabled={disabled}
              {...form.register('announcementText')}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="announcement-tone">{words.tone}</FieldLabel>
              <NativeSelect
                id="announcement-tone"
                disabled={disabled}
                {...form.register('announcementTone')}
              >
                <option value="info">{words.tones.info}</option>
                <option value="promo">{words.tones.promo}</option>
                <option value="warning">{words.tones.warning}</option>
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="announcement-ends">{words.endsAt}</FieldLabel>
              <Input
                id="announcement-ends"
                type="date"
                disabled={disabled}
                {...form.register('announcementEndsAt')}
              />
              <FieldDescription>{words.endsAtHint}</FieldDescription>
            </Field>
          </div>
        </FieldSet>

        {/* Section 3: About Text */}
        <FieldSet className="border-t pt-6">
          <FieldLegend>{words.about}</FieldLegend>
          <FieldDescription>{words.aboutHint}</FieldDescription>

          <Field>
            <FieldLabel htmlFor="about-text">{words.about}</FieldLabel>
            <Textarea
              id="about-text"
              rows={4}
              maxLength={600}
              placeholder={words.aboutPlaceholder}
              disabled={disabled}
              {...form.register('aboutText')}
            />
          </Field>
        </FieldSet>

        {/* Section 4: Google Review Link */}
        <FieldSet className="border-t pt-6">
          <FieldLegend>{words.googleReview}</FieldLegend>
          <FieldDescription>{words.googleReviewHint}</FieldDescription>

          <Field>
            <FieldLabel htmlFor="google-review-url">{words.googleReview}</FieldLabel>
            <Input
              id="google-review-url"
              type="url"
              placeholder={words.googleReviewPlaceholder}
              disabled={disabled}
              {...form.register('googleReviewUrl')}
            />
          </Field>
        </FieldSet>
      </FieldGroup>
    </SettingsForm>
  );
}

export default function HomePageScreen() {
  const shop = useShop();
  const settings = useShopSettings(shop.id);
  const banners = useShopBanners(shop.id);

  return (
    <SettingsLoader queries={[settings, banners]}>
      {() => (settings.data && banners.data ? (
        <HomePageEditor settings={settings.data} banners={banners.data} />
      ) : null)}
    </SettingsLoader>
  );
}
