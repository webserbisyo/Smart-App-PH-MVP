import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useShopSettings, useUpdateShopSettings } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import type { ShopSettings } from '@smartapp/core';
import { buttonVariants } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Textarea } from '@smartapp/ui/components/textarea';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconExternalLink } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { PhoneField } from '@smartapp/ui/patterns/PhoneField';

import { useShop } from '../../../app/shop';
import { SettingsForm, SettingsLoader } from '../components/SettingsPage';
import { InfoForm, infoFromSettings, infoPatch, messengerUsername } from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.info;

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
