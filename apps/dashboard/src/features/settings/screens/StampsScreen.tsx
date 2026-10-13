import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';

import { useSaveStampRule, useShopSettings, useStampRule, useUpdateShopSettings } from '@smartapp/api';
import { rewardLabel, WORDS } from '@smartapp/core';
import type { ShopSettings, StampRule } from '@smartapp/core';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Switch } from '@smartapp/ui/components/switch';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { PesoField } from '@smartapp/ui/patterns/PesoField';
import { StampCard } from '@smartapp/ui/patterns/StampCard';

import { useShop } from '../../../app/shop';
import { SettingsForm, SettingsLoader } from '../components/SettingsPage';
import { stampRuleFromForm, StampsForm, stampsFromData } from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.stamps;
/** Every new member starts with 1 welcome stamp (decision P4-F4), so the preview does too. */
const WELCOME_STAMPS = 1;

function SwitchRow({ control, name, label, hint, disabled }: { control: Control<StampsForm>; name: 'isActive' | 'showMemberCount'; label: string; hint: string; disabled: boolean }) {
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

function StampsEditor({ rule, settings }: { rule: StampRule; settings: ShopSettings }) {
  const online = useOnline();
  const saveRule = useSaveStampRule();
  const updateSettings = useUpdateShopSettings();
  const { saving, error, run } = useSaveRunner();
  const form = useForm<StampsForm>({ resolver: zodResolver(StampsForm), defaultValues: stampsFromData(rule, settings) });
  const { errors, isDirty } = form.formState;
  const [stampsText, rewardAmount] = useWatch({ control: form.control, name: ['stampsNeeded', 'rewardAmount'] });
  const disabled = saving || !online;
  const typed = Number(stampsText);
  const goal = Number.isInteger(typed) && typed >= 1 && typed <= 50 ? typed : rule.stampsNeeded;

  const save = (values: StampsForm) =>
    run(async () => {
      const saved = await saveRule.mutateAsync(stampRuleFromForm(rule.tenantId, values));
      const nextSettings =
        values.showMemberCount === settings.showMemberCount ? settings : await updateSettings.mutateAsync({ showMemberCount: values.showMemberCount });
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
          <SwitchRow control={form.control} name="showMemberCount" label={words.memberCount} hint={words.memberCountHint} disabled={disabled} />
        </div>

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
            {errors.stampsNeeded?.message ? <FieldError>{errors.stampsNeeded.message}</FieldError> : <FieldDescription>{words.stampsNeededHint}</FieldDescription>}
          </Field>
          <Controller
            control={form.control}
            name="rewardAmount"
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <PesoField label={words.reward} description={words.rewardHint} value={field.value} onChange={field.onChange} words={WORDS.shared} disabled={disabled} name={field.name} />
                {fieldState.error?.message ? <FieldError>{fieldState.error.message}</FieldError> : null}
              </div>
            )}
          />
          <Controller
            control={form.control}
            name="minOrderTotal"
            render={({ field }) => (
              <PesoField label={words.minimum} description={words.minimumHint} value={field.value} onChange={field.onChange} words={WORDS.shared} disabled={disabled} name={field.name} />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{words.preview}</span>
          <StampCard
            stamps={WELCOME_STAMPS}
            goal={goal}
            reward={rewardLabel(rewardAmount ?? rule.rewardAmount)}
            words={WORDS.shared.stamps}
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
  return (
    <SettingsLoader queries={[rule, settings]}>
      {() => (rule.data && settings.data ? <StampsEditor rule={rule.data} settings={settings.data} /> : null)}
    </SettingsLoader>
  );
}
