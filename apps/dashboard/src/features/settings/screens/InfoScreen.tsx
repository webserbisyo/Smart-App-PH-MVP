import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useShopSettings, useUpdateShopSettings } from '@smartapp/api';
import { mapsLink, pinFromMapsLink, WORDS } from '@smartapp/core';
import type { Pin, ShopSettings } from '@smartapp/core';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Textarea } from '@smartapp/ui/components/textarea';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconExternalLink, IconMapPin } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { PhoneField } from '@smartapp/ui/patterns/PhoneField';

import { useShop } from '../../../app/shop';
import { SettingsForm, SettingsLoader } from '../components/SettingsPage';
import { InfoForm, infoFromSettings, infoPatch, messengerUsername } from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.info;

function LocationField({
  value,
  onChange,
  disabled,
}: {
  value: Pin | null | undefined;
  onChange: (pin: Pin | null) => void;
  disabled: boolean;
}) {
  const [pasteLink, setPasteLink] = useState('');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isShortLink = pasteLink.includes('maps.app.goo.gl') || pasteLink.includes('goo.gl/maps');

  const handlePasteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setPasteLink(text);
    setLocationError(null);
    if (!text.trim()) return;
    if (text.includes('maps.app.goo.gl') || text.includes('goo.gl/maps')) {
      return;
    }
    const pin = pinFromMapsLink(text);
    if (pin) {
      onChange(pin);
      setPasteLink('');
    }
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocationError(WORDS.storefront.area.locationError);
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocating(false);
        setLocationError(WORDS.storefront.area.locationError);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <Field>
      <FieldLabel>{words.location}</FieldLabel>
      <FieldDescription>{words.locationHint}</FieldDescription>
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
        {value ? (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="tabular font-medium text-sm">
                {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={mapsLink(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
                >
                  <IconExternalLink className="size-3.5" />
                  {words.checkOnMaps}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    onChange(null);
                  }}
                >
                  {words.removePin}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{words.pinNotice}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || locating}
                onClick={handleUseCurrentLocation}
                className="gap-1.5"
              >
                <IconMapPin className="size-4" />
                {locating ? WORDS.shared.saving : words.useCurrentLocation}
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="paste-maps-link" className="text-xs">
                {words.pasteMapsLink}
              </FieldLabel>
              <Input
                id="paste-maps-link"
                value={pasteLink}
                onChange={handlePasteChange}
                placeholder={words.pasteMapsLinkHint}
                disabled={disabled}
              />
              {isShortLink ? (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  {words.shortLinkHint}
                </p>
              ) : null}
            </div>
            {locationError ? <p className="text-xs text-destructive">{locationError}</p> : null}
            <p className="text-xs text-muted-foreground">{words.pinNotice}</p>
          </div>
        )}
      </div>
    </Field>
  );
}

function InfoEditor({ settings }: { settings: ShopSettings }) {
  const online = useOnline();
  const update = useUpdateShopSettings();
  const { saving, error, run } = useSaveRunner();
  const form = useForm<InfoForm>({ resolver: zodResolver(InfoForm), defaultValues: infoFromSettings(settings) });
  const { errors, isDirty } = form.formState;
  const messenger = messengerUsername(useWatch({ control: form.control, name: 'messenger' }));
  const disabled = saving || !online;

  const save = (values: InfoForm) =>
    run(async () => {
      const saved = await update.mutateAsync(infoPatch(values));
      form.reset(infoFromSettings(saved));
    });

  return (
    <SettingsForm
      title={WORDS.dashboard.settings.sections.info}
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
        <Controller
          control={form.control}
          name="phone"
          render={({ field }) => <PhoneField label={words.phone} value={field.value} onChange={field.onChange} words={WORDS.shared} disabled={disabled} name={field.name} />}
        />
        <Field>
          <FieldLabel htmlFor="info-address">{words.address}</FieldLabel>
          <Textarea id="info-address" rows={2} maxLength={200} autoComplete="street-address" disabled={disabled} {...form.register('address')} />
          <FieldDescription>{words.addressHint}</FieldDescription>
        </Field>
        <Controller
          control={form.control}
          name="pin"
          render={({ field }) => (
            <LocationField
              value={field.value}
              onChange={field.onChange}
              disabled={disabled}
            />
          )}
        />
        <Field data-invalid={errors.facebook !== undefined || undefined}>
          <FieldLabel htmlFor="info-facebook">{words.facebook}</FieldLabel>
          <Input
            id="info-facebook"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder={words.facebookPlaceholder}
            aria-invalid={errors.facebook !== undefined}
            disabled={disabled}
            {...form.register('facebook')}
          />
          {errors.facebook?.message ? <FieldError>{errors.facebook.message}</FieldError> : null}
        </Field>
        <Field data-invalid={errors.messenger !== undefined || undefined}>
          <FieldLabel htmlFor="info-messenger">{words.messenger}</FieldLabel>
          <div className="flex gap-2">
            <Input
              id="info-messenger"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-w-0 flex-1"
              aria-invalid={errors.messenger !== undefined}
              disabled={disabled}
              {...form.register('messenger')}
            />
            {messenger ? (
              <a href={`https://m.me/${messenger}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: 'outline' }), 'shrink-0')}>
                <IconExternalLink aria-hidden="true" />
                {words.testLink}
              </a>
            ) : null}
          </div>
          {errors.messenger?.message ? <FieldError>{errors.messenger.message}</FieldError> : <FieldDescription>{words.messengerHint}</FieldDescription>}
        </Field>
      </FieldGroup>
    </SettingsForm>
  );
}

/** Contact number, address, Facebook page and Messenger (with a test link). */
export default function InfoScreen() {
  const shop = useShop();
  const settings = useShopSettings(shop.id);
  return <SettingsLoader queries={[settings]}>{() => (settings.data ? <InfoEditor settings={settings.data} /> : null)}</SettingsLoader>;
}
