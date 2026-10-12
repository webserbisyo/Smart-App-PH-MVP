import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { useAddClosure, useBusinessHours, useClosures, useRemoveClosure, useSaveBusinessHours, useShopSettings, useUpdateShopSettings } from '@smartapp/api';
import { manilaDate, timeToMinutes, WORDS } from '@smartapp/core';
import type { BusinessHours, Closure, ShopSettings } from '@smartapp/core';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Calendar } from '@smartapp/ui/components/calendar';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Switch } from '@smartapp/ui/components/switch';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconAlertTriangle } from '@smartapp/ui/icons';

import { row } from '../../../app/form-path';
import { useShop } from '../../../app/shop';
import { SettingsForm, SettingsLoader } from '../components/SettingsPage';
import { closureChanges, dateFromKey, dateKey, HoursForm, hoursFromData, weekFromForm } from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.hours;

function HoursEditor({ hours, closures, settings }: { hours: readonly BusinessHours[]; closures: readonly Closure[]; settings: ShopSettings }) {
  const online = useOnline();
  const saveHours = useSaveBusinessHours();
  const addClosure = useAddClosure();
  const removeClosure = useRemoveClosure();
  const updateSettings = useUpdateShopSettings();
  const { saving, error, run } = useSaveRunner();
  const form = useForm<HoursForm>({ resolver: zodResolver(HoursForm), defaultValues: hoursFromData(hours, closures, settings) });
  const { errors, isDirty } = form.formState;
  const days = useWatch({ control: form.control, name: 'days' });
  const closedDays = useWatch({ control: form.control, name: 'closedDays' });
  const disabled = saving || !online;
  const today = manilaDate(new Date());
  const upcoming = closedDays.filter((date) => date >= today);

  const save = (values: HoursForm) =>
    run(async () => {
      const before = form.formState.defaultValues;
      await saveHours.mutateAsync(weekFromForm(values));
      const changes = closureChanges((before?.closedDays ?? []).flatMap((date) => (date ? [date] : [])), values.closedDays);
      for (const closedOn of changes.add) await addClosure.mutateAsync({ closedOn, note: null });
      for (const closedOn of changes.remove) await removeClosure.mutateAsync({ closedOn });
      if (values.paused !== before?.paused) await updateSettings.mutateAsync({ acceptingOrders: !values.paused });
      form.reset(values);
    });

  return (
    <SettingsForm
      title={WORDS.dashboard.settings.sections.hours}
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
          name="paused"
          render={({ field }) => (
            <Field orientation="horizontal" className="justify-between rounded-lg border p-3">
              <div className="flex flex-col gap-0.5">
                <FieldLabel htmlFor="hours-paused">{words.pause}</FieldLabel>
                <FieldDescription>{words.pauseHint}</FieldDescription>
              </div>
              <Switch id="hours-paused" checked={field.value} onCheckedChange={field.onChange} disabled={disabled} />
            </Field>
          )}
        />

        <ul className="flex flex-col divide-y rounded-lg border">
          {days.map((day, index) => {
            const name = words.days[day.weekday] ?? '';
            const closesError = errors.days?.[index]?.closesAt?.message;
            const overnight = day.open && timeToMinutes(day.closesAt) < timeToMinutes(day.opensAt);
            return (
              <li key={day.weekday} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4">
                <Controller
                  control={form.control}
                  name={`days.${row(index)}.open`}
                  render={({ field }) => (
                    <label className="flex min-h-11 items-center justify-between gap-3 sm:w-44">
                      <span className="font-medium">{name}</span>
                      <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled} aria-label={words.open(name)} />
                    </label>
                  )}
                />
                {day.open ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Input
                      type="time"
                      step={300}
                      aria-label={`${name} ${words.from}`}
                      className="w-36"
                      disabled={disabled}
                      {...form.register(`days.${row(index)}.opensAt`)}
                    />
                    <span className="text-sm text-muted-foreground">{words.to}</span>
                    <Input
                      type="time"
                      step={300}
                      aria-label={`${name} ${words.to}`}
                      className="w-36"
                      aria-invalid={closesError !== undefined}
                      disabled={disabled}
                      {...form.register(`days.${row(index)}.closesAt`)}
                    />
                    {overnight ? <span className="text-xs text-muted-foreground">{words.overnight}</span> : null}
                    {closesError ? <FieldError className="w-full">{closesError}</FieldError> : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {days.every((day) => !day.open) ? (
          <Alert role="status" className="border-warning bg-warning-soft text-warning-soft-foreground">
            <IconAlertTriangle aria-hidden="true" />
            <AlertDescription className="text-warning-soft-foreground">{words.allClosed}</AlertDescription>
          </Alert>
        ) : null}

        <FieldSet>
          <FieldLegend>{words.closedDays}</FieldLegend>
          <FieldDescription>
            {words.closedDaysHint} {upcoming.length > 0 ? words.closedCount(upcoming.length) : null}
          </FieldDescription>
          <Controller
            control={form.control}
            name="closedDays"
            render={({ field }) => (
              <Calendar
                mode="multiple"
                selected={field.value.map(dateFromKey)}
                onSelect={(dates) => {
                  // Past closed days stay as they are; the calendar only changes today and later.
                  const past = field.value.filter((date) => date < today);
                  field.onChange([...new Set([...past, ...(dates ?? []).map(dateKey)])].sort());
                }}
                disabled={disabled ? true : { before: dateFromKey(today) }}
                className="self-start rounded-xl border"
              />
            )}
          />
        </FieldSet>
      </FieldGroup>
    </SettingsForm>
  );
}

/** Weekly hours in Manila time, closed days and "Pause orders now", saved together. */
export default function HoursScreen() {
  const shop = useShop();
  const settings = useShopSettings(shop.id);
  const hours = useBusinessHours(shop.id);
  const closures = useClosures(shop.id);
  return (
    <SettingsLoader queries={[settings, hours, closures]}>
      {() => (settings.data && hours.data && closures.data ? <HoursEditor hours={hours.data} closures={closures.data} settings={settings.data} /> : null)}
    </SettingsLoader>
  );
}
