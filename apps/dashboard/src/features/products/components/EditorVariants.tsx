import { Controller, useFieldArray, useFormState, useWatch } from 'react-hook-form';
import type { Control, UseFormRegister } from 'react-hook-form';

import { WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Label } from '@smartapp/ui/components/label';
import { Switch } from '@smartapp/ui/components/switch';
import { IconPlus, IconTrash } from '@smartapp/ui/icons';
import { PesoField } from '@smartapp/ui/patterns/PesoField';

import { row } from '../../../app/form-path';
import { emptyVariant } from '../form';
import type { ProductForm } from '../form';

import { CountInput } from './CountInput';

const words = WORDS.dashboard.products.editor;

/**
 * Price rows: name, price, stock (while tracking) and sold out. With one row the name is hidden (the customer sees
 * no choice); adding a row asks for names.
 */
export function EditorVariants({ control, register, disabled }: { control: Control<ProductForm>; register: UseFormRegister<ProductForm>; disabled: boolean }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'variants', keyName: 'key' });
  const trackStock = useWatch({ control, name: 'trackStock' });
  const { errors } = useFormState({ control, name: 'variants' });
  const single = fields.length === 1;

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {fields.map((field, index) => {
          const rowErrors = errors.variants?.[index];
          return (
            <li key={field.key} className="grid grid-cols-2 items-start gap-3 rounded-lg border p-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_auto]">
              {single ? null : (
                <Field data-invalid={rowErrors?.name !== undefined || undefined} className="col-span-2 sm:col-span-1">
                  <FieldLabel htmlFor={`variant-name-${field.key}`}>{words.variantName}</FieldLabel>
                  <Input
                    id={`variant-name-${field.key}`}
                    placeholder={words.variantPlaceholder}
                    maxLength={60}
                    aria-invalid={rowErrors?.name !== undefined}
                    disabled={disabled}
                    {...register(`variants.${row(index)}.name`)}
                  />
                  {rowErrors?.name?.message ? <FieldError>{rowErrors.name.message}</FieldError> : null}
                </Field>
              )}
              <Controller
                control={control}
                name={`variants.${row(index)}.price`}
                render={({ field: price, fieldState }) => (
                  <div className={single && !trackStock ? 'col-span-2 sm:col-span-1' : undefined}>
                    <PesoField label={words.price} value={price.value} onChange={price.onChange} words={WORDS.shared} disabled={disabled} name={price.name} />
                    {fieldState.error?.message ? <FieldError className="mt-2">{fieldState.error.message}</FieldError> : null}
                  </div>
                )}
              />
              {trackStock ? (
                <Controller
                  control={control}
                  name={`variants.${row(index)}.stock`}
                  render={({ field: stock, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor={`variant-stock-${field.key}`}>{words.stock}</FieldLabel>
                      <CountInput id={`variant-stock-${field.key}`} value={stock.value} onChange={stock.onChange} aria-invalid={fieldState.invalid} disabled={disabled} />
                      {fieldState.error?.message ? <FieldError>{fieldState.error.message}</FieldError> : null}
                    </Field>
                  )}
                />
              ) : null}
              <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:h-full sm:flex-col sm:items-end sm:justify-start sm:pt-1">
                <Controller
                  control={control}
                  name={`variants.${row(index)}.isSoldOut`}
                  render={({ field: soldOut }) => (
                    <Label className="flex min-h-11 items-center gap-2 text-sm font-normal sm:min-h-0">
                      <Switch checked={soldOut.value} onCheckedChange={soldOut.onChange} disabled={disabled} />
                      {WORDS.dashboard.products.soldOut}
                    </Label>
                  )}
                />
                {single ? null : (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={words.removeVariant(field.name.trim() === '' ? String(index + 1) : field.name)}
                    disabled={disabled}
                    onClick={() => {
                      remove(index);
                    }}
                  >
                    <IconTrash />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <Button
        variant="outline"
        className="self-start"
        disabled={disabled || fields.length >= 20}
        onClick={() => {
          append(emptyVariant());
        }}
      >
        <IconPlus aria-hidden="true" />
        {words.addVariant}
      </Button>
    </div>
  );
}
