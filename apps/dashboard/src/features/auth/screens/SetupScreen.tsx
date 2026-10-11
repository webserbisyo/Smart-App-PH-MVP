import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { BusinessType, errorWords, Slug, slugFromName, VOCAB, WORDS } from '@smartapp/core';
import { useCreateMyShop, useSlugAvailable } from '@smartapp/api';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Spinner } from '@smartapp/ui/components/spinner';
import { IconBuildingStore, IconToolsKitchen2 } from '@smartapp/ui/icons';

import { AuthPage } from '../components/AuthPage';

const words = WORDS.dashboard.setup;

const SetupForm = z.object({
  businessType: BusinessType,
  name: z.string().trim().min(1).max(80),
  slug: Slug,
});
type SetupForm = z.infer<typeof SetupForm>;

const TYPES = [
  { value: 'food', label: words.food, icon: IconToolsKitchen2 },
  { value: 'retail', label: words.retail, icon: IconBuildingStore },
] as const;

/** The link name after the owner stops typing for 400 ms. */
function useDebounced(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(value);
    }, ms);
    return () => {
      window.clearTimeout(timer);
    };
  }, [value, ms]);
  return debounced;
}

/** Business type, shop name, link name with live availability, then a pending shop (the guard opens Waiting). */
export default function SetupScreen() {
  const create = useCreateMyShop();
  const [slugEdited, setSlugEdited] = useState(false);
  const form = useForm<SetupForm>({
    resolver: zodResolver(SetupForm),
    defaultValues: { businessType: 'food', name: '', slug: '' },
  });
  const { errors } = form.formState;
  const slug = useWatch({ control: form.control, name: 'slug' });
  const debouncedSlug = useDebounced(slug, 400);
  const available = useSlugAvailable(debouncedSlug);
  const settled = debouncedSlug === slug && slug.length > 0;
  const nameField = form.register('name');

  return (
    <AuthPage title={words.title} intro={words.intro}>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit((values) => {
            create.mutate(values);
          })(event);
        }}
      >
        <FieldGroup>
          <FieldSet>
            <FieldLegend>{words.type}</FieldLegend>
            <Controller
              control={form.control}
              name="businessType"
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={(value) => {
                    const parsed = BusinessType.safeParse(value);
                    if (parsed.success) field.onChange(parsed.data);
                  }}
                  className="grid grid-cols-2 gap-3"
                >
                  {TYPES.map((type) => (
                    <FieldLabel key={type.value} htmlFor={`type-${type.value}`}>
                      <Field orientation="horizontal" className="items-start">
                        <RadioGroupItem id={`type-${type.value}`} value={type.value} className="sr-only" />
                        <div className="flex flex-col gap-1">
                          <type.icon aria-hidden="true" className="size-6" />
                          <span className="font-semibold">{type.label}</span>
                          <span className="text-sm text-muted-foreground">
                            {words.typeHint(VOCAB[type.value].catalog, VOCAB[type.value].prep)}
                          </span>
                        </div>
                      </Field>
                    </FieldLabel>
                  ))}
                </RadioGroup>
              )}
            />
          </FieldSet>
          <Field data-invalid={errors.name !== undefined}>
            <FieldLabel htmlFor="shop-name">{words.name}</FieldLabel>
            <Input
              id="shop-name"
              autoComplete="organization"
              aria-invalid={errors.name !== undefined}
              {...nameField}
              onChange={(event) => {
                void nameField.onChange(event);
                if (!slugEdited) form.setValue('slug', slugFromName(event.target.value), { shouldValidate: false });
              }}
            />
          </Field>
          <Field data-invalid={errors.slug !== undefined || (settled && available.data === false)}>
            <FieldLabel htmlFor="shop-slug">{words.slug}</FieldLabel>
            <Input
              id="shop-slug"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={errors.slug !== undefined}
              {...form.register('slug', {
                onChange: () => {
                  setSlugEdited(true);
                },
              })}
            />
            <FieldDescription aria-live="polite">
              {slug.length === 0
                ? words.slugHint
                : !settled || available.isFetching
                  ? words.checking
                  : available.data === true
                    ? `${words.available}: ${words.link(slug)}`
                    : words.notAvailable}
            </FieldDescription>
            {errors.slug?.message ? <FieldError>{errors.slug.message}</FieldError> : null}
          </Field>
          {create.error ? <FieldError>{errorWords(create.error.code)}</FieldError> : null}
          <Button type="submit" size="lg" disabled={create.isPending}>
            {create.isPending ? <Spinner /> : null}
            {words.submit}
          </Button>
        </FieldGroup>
      </form>
    </AuthPage>
  );
}
