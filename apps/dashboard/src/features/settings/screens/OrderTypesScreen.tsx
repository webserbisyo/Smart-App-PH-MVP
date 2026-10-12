import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';

import { useDeliveryZones, useRemoveDeliveryZone, useSaveDeliveryZone, useSaveSortOrder, useShopSettings, useUpdateShopSettings } from '@smartapp/api';
import { WORDS } from '@smartapp/core';
import type { DeliveryZone, ShopSettings } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Sortable, SortableContent, SortableItem, SortableItemHandle } from '@smartapp/ui/components/sortable';
import { Switch } from '@smartapp/ui/components/switch';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconGripVertical, IconPlus, IconTrash } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { PesoField } from '@smartapp/ui/patterns/PesoField';

import { row } from '../../../app/form-path';
import { useShop } from '../../../app/shop';
import { SettingsForm, SettingsLoader } from '../components/SettingsPage';
import { emptyZone, OrderTypesForm, orderTypesFromData, orderTypesPatch, zoneChanges } from '../forms';
import type { ZoneForm } from '../forms';
import { useSaveRunner } from '../hooks/useSaveRunner';

const words = WORDS.dashboard.settings.orderTypes;
const MAX_ZONES = 30;

type SwitchName = 'walkIn' | 'pickup' | 'delivery' | 'payLaterPickup' | 'cod' | 'viaMessenger';

/** One switch with its label and hint; `locked` keeps it on (the last order type). */
function SwitchRow({
  control,
  name,
  label,
  hint,
  disabled,
  locked = false,
  nested = false,
}: {
  control: Control<OrderTypesForm>;
  name: SwitchName;
  label: string;
  hint: string;
  disabled: boolean;
  locked?: boolean;
  nested?: boolean;
}) {
  const id = `order-types-${name}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn(nested && 'pl-4')}>
          <Field orientation="horizontal" className={cn('justify-between gap-4 py-3', nested && 'border-l pl-4')}>
            <div className="flex flex-col gap-0.5">
              <FieldLabel htmlFor={id}>{label}</FieldLabel>
              <FieldDescription>{hint}</FieldDescription>
            </div>
            <Switch id={id} checked={field.value} onCheckedChange={field.onChange} disabled={disabled || (locked && field.value)} />
          </Field>
        </div>
      )}
    />
  );
}

function Zones({ control, disabled }: { control: Control<OrderTypesForm>; disabled: boolean }) {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'zones', keyName: 'key' });
  const zones = useWatch({ control, name: 'zones' });
  return (
    <div className="flex flex-col gap-3">
      {fields.length > 0 ? (
        <Sortable
          value={fields}
          getItemValue={(field) => field.key}
          orientation="vertical"
          onMove={({ activeIndex, overIndex }) => {
            move(activeIndex, overIndex);
          }}
        >
          <SortableContent render={<ul />} className="flex flex-col gap-2">
            {fields.map((field, index) => {
              const name = zones[index]?.name.trim() ?? '';
              const label = name === '' ? String(index + 1) : name;
              return (
                <SortableItem key={field.key} value={field.key} render={<li />} className="flex items-start gap-1 rounded-lg border bg-card p-2">
                  <SortableItemHandle disabled={disabled} render={<Button variant="ghost" size="icon-sm" className="mt-7" aria-label={words.moveZone(label)} />}>
                    <IconGripVertical />
                  </SortableItemHandle>
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                    <Controller
                      control={control}
                      name={`zones.${row(index)}.name`}
                      render={({ field: zoneName, fieldState }) => (
                        <Field data-invalid={fieldState.invalid || undefined}>
                          <FieldLabel htmlFor={`zone-name-${field.key}`}>{words.zoneName}</FieldLabel>
                          <Input
                            id={`zone-name-${field.key}`}
                            maxLength={60}
                            placeholder={words.zonePlaceholder}
                            aria-invalid={fieldState.invalid}
                            disabled={disabled}
                            {...zoneName}
                          />
                          {fieldState.error?.message ? <FieldError>{fieldState.error.message}</FieldError> : null}
                        </Field>
                      )}
                    />
                    <Controller
                      control={control}
                      name={`zones.${row(index)}.fee`}
                      render={({ field: fee, fieldState }) => (
                        <div>
                          <PesoField label={words.zoneFee} value={fee.value} onChange={fee.onChange} words={WORDS.shared} disabled={disabled} name={fee.name} />
                          {fieldState.error?.message ? <FieldError className="mt-2">{fieldState.error.message}</FieldError> : null}
                        </div>
                      )}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mt-7"
                    aria-label={words.removeZone(label)}
                    disabled={disabled}
                    onClick={() => {
                      remove(index);
                    }}
                  >
                    <IconTrash />
                  </Button>
                </SortableItem>
              );
            })}
          </SortableContent>
        </Sortable>
      ) : null}
      <Button
        variant="outline"
        className="self-start"
        disabled={disabled || fields.length >= MAX_ZONES}
        onClick={() => {
          append(emptyZone());
        }}
      >
        <IconPlus aria-hidden="true" />
        {words.addZone}
      </Button>
    </div>
  );
}

function OrderTypesEditor({ settings, zones }: { settings: ShopSettings; zones: readonly DeliveryZone[] }) {
  const online = useOnline();
  const updateSettings = useUpdateShopSettings();
  const saveZone = useSaveDeliveryZone();
  const removeZone = useRemoveDeliveryZone();
  const sortOrder = useSaveSortOrder();
  const { saving, error, run } = useSaveRunner();
  const form = useForm<OrderTypesForm>({ resolver: zodResolver(OrderTypesForm), defaultValues: orderTypesFromData(settings, zones) });
  const { errors, isDirty } = form.formState;
  const [walkIn, pickup, delivery] = useWatch({ control: form.control, name: ['walkIn', 'pickup', 'delivery'] });
  const disabled = saving || !online;
  const onCount = [walkIn, pickup, delivery].filter(Boolean).length;

  const save = (values: OrderTypesForm) =>
    run(async () => {
      const saved = await updateSettings.mutateAsync(orderTypesPatch(values));
      const changes = zoneChanges(zones, values.zones);
      for (const zoneId of changes.remove) await removeZone.mutateAsync({ zoneId });
      const ids = values.zones.map((zone) => zone.id);
      for (const { index, draft } of changes.save) {
        const result = await saveZone.mutateAsync(draft);
        ids[index] = result.id;
      }
      const order = ids.flatMap((id) => (id === null ? [] : [id]));
      const kept = zones.map((zone) => zone.id).filter((id) => order.includes(id));
      if (order.length > 1 && order.join() !== [...kept, ...order.filter((id) => !kept.includes(id))].join()) {
        await sortOrder.mutateAsync({ kind: 'deliveryZones', ids: order });
      }
      const next: ZoneForm[] = values.zones.map((zone, index) => ({ ...zone, id: ids[index] ?? null, name: zone.name.trim(), fee: zone.fee ?? 0 }));
      form.reset({ ...orderTypesFromData(saved, []), zones: next });
    });

  return (
    <SettingsForm
      title={WORDS.dashboard.settings.sections.orderTypes}
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
        <FieldSet>
          <div className="flex flex-col divide-y">
            <SwitchRow control={form.control} name="walkIn" label={words.walkIn} hint={words.walkInHint} disabled={disabled} locked={onCount === 1} />
            <SwitchRow control={form.control} name="pickup" label={words.pickup} hint={words.pickupHint} disabled={disabled} locked={onCount === 1} />
            {pickup ? <SwitchRow control={form.control} name="payLaterPickup" label={words.payLaterPickup} hint={words.payLaterPickupHint} disabled={disabled} nested /> : null}
            <SwitchRow control={form.control} name="delivery" label={words.delivery} hint={words.deliveryHint} disabled={disabled} locked={onCount === 1} />
            {delivery ? <SwitchRow control={form.control} name="cod" label={words.cod} hint={words.codHint} disabled={disabled} nested /> : null}
          </div>
          {errors.walkIn?.message ? <FieldError>{errors.walkIn.message}</FieldError> : onCount === 1 ? <FieldDescription>{words.oneNeeded}</FieldDescription> : null}
        </FieldSet>

        {delivery ? (
          <FieldSet>
            <FieldLegend>{words.zones}</FieldLegend>
            <FieldDescription>{words.zonesHint}</FieldDescription>
            <Zones control={form.control} disabled={disabled} />
            {errors.zones?.message ? <FieldError>{errors.zones.message}</FieldError> : null}
            <div className="rounded-lg border px-3">
              <SwitchRow control={form.control} name="viaMessenger" label={words.viaMessenger} hint={words.viaMessengerHint} disabled={disabled} />
            </div>
          </FieldSet>
        ) : null}
      </FieldGroup>
    </SettingsForm>
  );
}

/** Walk-in, Pickup and Delivery with their pay-later rules, and the delivery areas. */
export default function OrderTypesScreen() {
  const shop = useShop();
  const settings = useShopSettings(shop.id);
  const zones = useDeliveryZones(shop.id);
  return (
    <SettingsLoader queries={[settings, zones]}>
      {() => (settings.data && zones.data ? <OrderTypesEditor settings={settings.data} zones={zones.data} /> : null)}
    </SettingsLoader>
  );
}
