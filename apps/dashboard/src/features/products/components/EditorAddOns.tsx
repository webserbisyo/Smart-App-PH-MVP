import { Controller, useFieldArray, useFormState, useWatch } from 'react-hook-form';
import type { Control, UseFormRegister } from 'react-hook-form';

import { WORDS } from '@smartapp/core';
import type { CatalogItem, OptionGroup } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { Switch } from '@smartapp/ui/components/switch';
import { IconPlus, IconTrash } from '@smartapp/ui/icons';
import { PesoField } from '@smartapp/ui/patterns/PesoField';

import { emptyGroup, emptyOption, groupValue, row } from '../form';
import type { ProductForm } from '../form';

import { CountInput } from './CountInput';

const words = WORDS.dashboard.products.editor;

interface Shared {
  control: Control<ProductForm>;
  register: UseFormRegister<ProductForm>;
  disabled: boolean;
}

function GroupOptions({ control, register, disabled, groupIndex }: Shared & { groupIndex: number }) {
  const { fields, append, remove } = useFieldArray({ control, name: `groups.${row(groupIndex)}.options`, keyName: 'key' });
  const { errors } = useFormState({ control, name: `groups.${row(groupIndex)}.options` });
  const groupErrors = errors.groups?.[groupIndex];
  const listError = groupErrors?.options?.root?.message ?? groupErrors?.options?.message;

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {fields.map((field, index) => {
          const nameError = groupErrors?.options?.[index]?.name?.message;
          return (
            <li key={field.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,8rem)_auto] items-start gap-2">
              <Field data-invalid={nameError !== undefined || undefined}>
                <FieldLabel htmlFor={`option-${field.key}`} className={index === 0 ? undefined : 'sr-only'}>
                  {words.optionName}
                </FieldLabel>
                <Input id={`option-${field.key}`} maxLength={60} aria-invalid={nameError !== undefined} disabled={disabled} {...register(`groups.${row(groupIndex)}.options.${row(index)}.name`)} />
                {nameError ? <FieldError>{nameError}</FieldError> : null}
              </Field>
              <Controller
                control={control}
                name={`groups.${row(groupIndex)}.options.${row(index)}.priceDelta`}
                render={({ field: price }) => (
                  <div className={index === 0 ? undefined : '[&_label]:sr-only'}>
                    <PesoField label={words.optionPrice} value={price.value} onChange={price.onChange} words={WORDS.shared} disabled={disabled} name={price.name} />
                  </div>
                )}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                className={index === 0 ? 'mt-7' : undefined}
                aria-label={words.removeOption(field.name.trim() === '' ? String(index + 1) : field.name)}
                disabled={disabled}
                onClick={() => {
                  remove(index);
                }}
              >
                <IconTrash />
              </Button>
            </li>
          );
        })}
      </ul>
      {listError ? <FieldError>{listError}</FieldError> : null}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={disabled || fields.length >= 30}
        onClick={() => {
          append(emptyOption());
        }}
      >
        <IconPlus aria-hidden="true" />
        {words.addOption}
      </Button>
    </div>
  );
}

/**
 * Add-on groups on this item: name, required, most choices, and the choices with their extra price. Groups belong to
 * the shop, so one made for another item can be added here too; changing it changes it there as well.
 */
export function EditorAddOns({ control, register, disabled, shopGroups, catalog, itemId }: Shared & { shopGroups: readonly OptionGroup[]; catalog: readonly CatalogItem[]; itemId: string | null }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'groups', keyName: 'key' });
  const { errors } = useFormState({ control, name: 'groups' });
  const groups = useWatch({ control, name: 'groups' });
  const usedIds = new Set(groups.flatMap((group) => (group.id === null ? [] : [group.id])));
  const unused = shopGroups.filter((group) => !usedIds.has(group.id));
  const usedElsewhere = (groupId: string | null) =>
    groupId === null ? 0 : catalog.filter((item) => item.id !== itemId && item.optionGroupIds.includes(groupId)).length;

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field, index) => {
        const groupErrors = errors.groups?.[index];
        const others = usedElsewhere(field.id);
        return (
          <fieldset key={field.key} className="flex flex-col gap-3 rounded-lg border p-3">
            <legend className="sr-only">{words.groupTitle(index + 1)}</legend>
            <Field data-invalid={groupErrors?.name !== undefined || undefined}>
              <FieldLabel htmlFor={`group-name-${field.key}`}>{words.groupName}</FieldLabel>
              <Input
                id={`group-name-${field.key}`}
                placeholder={words.groupPlaceholder}
                maxLength={60}
                aria-invalid={groupErrors?.name !== undefined}
                disabled={disabled}
                {...register(`groups.${row(index)}.name`)}
              />
              {groupErrors?.name?.message ? <FieldError>{groupErrors.name.message}</FieldError> : null}
              {others > 0 ? <FieldDescription>{words.sharedGroup(others)}</FieldDescription> : null}
            </Field>
            <div className="flex flex-wrap items-start gap-4">
              <Controller
                control={control}
                name={`groups.${row(index)}.required`}
                render={({ field: required }) => (
                  <Label className="flex min-h-11 items-center gap-2 text-sm font-normal">
                    <Switch checked={required.value} onCheckedChange={required.onChange} disabled={disabled} />
                    {words.required}
                  </Label>
                )}
              />
              <Controller
                control={control}
                name={`groups.${row(index)}.maxSelect`}
                render={({ field: max, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined} className="w-auto">
                    <FieldLabel htmlFor={`group-max-${field.key}`}>{words.maxChoices}</FieldLabel>
                    <CountInput id={`group-max-${field.key}`} value={max.value} onChange={max.onChange} className="w-24" aria-invalid={fieldState.invalid} disabled={disabled} />
                    {fieldState.error?.message ? <FieldError>{fieldState.error.message}</FieldError> : null}
                  </Field>
                )}
              />
            </div>
            <GroupOptions control={control} register={register} disabled={disabled} groupIndex={index} />
            <Button
              variant="ghost"
              size="sm"
              className="self-end text-destructive-text"
              disabled={disabled}
              onClick={() => {
                remove(index);
              }}
            >
              <IconTrash aria-hidden="true" />
              {words.removeGroup}
            </Button>
          </fieldset>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => {
            append(emptyGroup());
          }}
        >
          <IconPlus aria-hidden="true" />
          {words.addGroup}
        </Button>
        {unused.length > 0 ? (
          <NativeSelect
            aria-label={words.useGroup}
            value=""
            disabled={disabled}
            className="min-w-0 flex-1 basis-48"
            onChange={(event) => {
              const group = unused.find((candidate) => candidate.id === event.target.value);
              if (group) append(groupValue(group));
            }}
          >
            <NativeSelectOption value="">{words.useGroup}</NativeSelectOption>
            {unused.map((group) => (
              <NativeSelectOption key={group.id} value={group.id}>
                {group.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        ) : null}
      </div>
    </div>
  );
}
