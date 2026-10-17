'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { toApiError, usePlaceOrder, useQuote } from '@smartapp/api';
import {
  allowedPaymentMethods,
  availableFulfillments,
  errorWords,
  formatPeso,
  Fulfillment,
  mapsLink,
  PaymentMethod,
  pickupSlots,
  TransferMethod,
  VOCAB,
  WORDS,
} from '@smartapp/core';
import type { Fulfillment as FulfillmentValue, Pin } from '@smartapp/core';
import { FLUENT_ICONS } from '@smartapp/ui/assets/fluent';
import { Alert, AlertDescription } from '@smartapp/ui/components/alert';
import { Button, buttonVariants } from '@smartapp/ui/components/button';
import { Checkbox } from '@smartapp/ui/components/checkbox';
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from '@smartapp/ui/components/empty';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { RadioGroup, RadioGroupItem } from '@smartapp/ui/components/radio-group';
import { Skeleton } from '@smartapp/ui/components/skeleton';
import { Spinner } from '@smartapp/ui/components/spinner';
import { ToggleGroup, ToggleGroupItem } from '@smartapp/ui/components/toggle-group';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconCheck, IconExternalLink, IconMapPin } from '@smartapp/ui/icons';
import { cn } from '@smartapp/ui/lib/utils';
import { OrderLines } from '@smartapp/ui/patterns/OrderLines';
import { PhoneField } from '@smartapp/ui/patterns/PhoneField';
import { StickyActionBar } from '@smartapp/ui/patterns/StickyActionBar';

import { RewardSwitch } from '../members/RewardSwitch';
import { useMember } from '../members/use-member';
import { useReward } from '../members/use-reward';
import { useShop } from '../shell/ShopProvider';
import { useHydrated } from '../shell/use-hydrated';
import { CHOICE_ROW, PICKED } from '../shell/choice';
import { checkoutSchema, toOrderInput, toQuotePayload } from './checkout-form';
import type { CheckoutValues } from './checkout-form';
import { readRemembered, saveRemembered } from './remember-me';
import { TransferAccounts } from './TransferAccounts';

const words = WORDS.storefront.checkout;
const PRESSED = 'flex-1 aria-pressed:border-shop-10 aria-pressed:bg-shop-10 aria-pressed:text-shop-10-foreground';
/** Pickup slots are rebuilt every minute, so a time that has passed drops out. */
const CLOCK_MS = 60_000;

function CheckoutSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-6" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/** How the customer pays with this method, in one line. */
function methodHint(method: PaymentMethod, fulfillment: FulfillmentValue): string {
  if (method === 'cod') return words.methodHint.cod;
  if (method === 'cash') return fulfillment === 'pickup' ? words.methodHint.cashPickup : words.methodHint.cash;
  return words.methodHint.transfer;
}

function CheckoutForm({ onPlaced }: { onPlaced: () => void }) {
  const { storefront, cart, block, removeLine, clearCart, rejectReward, detectedPin, setDetectedPin } = useShop();
  const { account } = useMember();
  const reward = useReward();
  const router = useRouter();
  const online = useOnline();
  const { shop, paymentAccounts } = storefront;
  const { settings } = shop;
  const vocab = VOCAB[shop.businessType];
  const fulfillments = availableFulfillments(settings);
  const zones = storefront.deliveryZones.filter((zone) => zone.isActive);
  const zoneRequired = !settings.deliveryFeeViaMessenger;
  const rules = useMemo(() => ({ zoneRequired }), [zoneRequired]);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, CLOCK_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  const slots = useMemo(() => pickupSlots(storefront.hours, storefront.closures, now), [storefront.hours, storefront.closures, now]);

  const schema = useMemo(() => checkoutSchema(rules), [rules]);
  const [defaults] = useState((): CheckoutValues => {
    const remembered = readRemembered(shop.slug);
    const fulfillment = fulfillments[0] ?? 'walk_in';
    return {
      fulfillment,
      // A closed shop still takes pickup orders for later, so start on the first time it is open.
      pickupAt: block === null ? '' : (slots[0]?.at ?? ''),
      addressLine: '',
      landmark: '',
      deliveryZoneId: '',
      pin: detectedPin,
      name: remembered?.name ?? '',
      phone: remembered?.phone ?? null,
      email: remembered?.email ?? '',
      remember: true,
      paymentMethod: allowedPaymentMethods(fulfillment, settings, paymentAccounts)[0] ?? null,
      privacy: false,
    };
  });
  const form = useForm<CheckoutValues>({ resolver: zodResolver(schema), defaultValues: defaults });
  const { errors } = form.formState;
  const [fulfillment, pickupAt, deliveryZoneId, paymentMethod] = useWatch({
    control: form.control,
    name: ['fulfillment', 'pickupAt', 'deliveryZoneId', 'paymentMethod'],
  });
  const methods = allowedPaymentMethods(fulfillment, settings, paymentAccounts);
  const pin = useWatch({ control: form.control, name: 'pin' });
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const handleUseLocation = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setLocError(words.locationError);
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const userPin: Pin = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        };
        form.setValue('pin', userPin, { shouldDirty: true });
        setDetectedPin(userPin);
      },
      () => {
        setLocating(false);
        setLocError(words.locationError);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleRemovePin = () => {
    form.setValue('pin', null, { shouldDirty: true });
    setDetectedPin(null);
  };

  // A pickup time that has passed falls back to as soon as possible.
  useEffect(() => {
    if (pickupAt !== '' && !slots.some((slot) => slot.at === pickupAt)) form.setValue('pickupAt', '');
  }, [form, pickupAt, slots]);

  const lines = useMemo(() => cart.lines.map((priced) => priced.line), [cart.lines]);
  const quotePayload = useMemo(
    () => toQuotePayload({ fulfillment, pickupAt, deliveryZoneId, paymentMethod }, lines, rules, reward.on),
    [fulfillment, pickupAt, deliveryZoneId, paymentMethod, lines, rules, reward.on],
  );
  const quote = useQuote(shop.slug, quotePayload);
  const place = usePlaceOrder();

  // No quote yet (no method, or no delivery area): show the cart's own prices, never an older quote's.
  const priced = quotePayload === null ? undefined : quote.data;
  const problems = new Map((priced?.problems ?? []).map((problem) => [problem.lineIndex, problem.code]));
  const total = priced?.total ?? cart.subtotal;
  const shopError = place.error ? toApiError(place.error).code : quotePayload !== null && quote.error ? toApiError(quote.error).code : null;
  const transfer = paymentMethod === null ? null : TransferMethod.safeParse(paymentMethod);

  // The database says the reward is not ready (used on another phone, or a stamp was taken back): switch it off.
  const quoteRefusedReward = quotePayload?.useReward === true && quote.error !== null && toApiError(quote.error).code === 'reward_unavailable';
  useEffect(() => {
    if (quoteRefusedReward) rejectReward();
  }, [quoteRefusedReward, rejectReward]);

  // Members: details and the default address from the account, unless the customer already typed something.
  useEffect(() => {
    if (!account) return;
    const address = account.addresses.find((saved) => saved.isDefault) ?? account.addresses[0];
    const fill: ['name' | 'email' | 'addressLine' | 'landmark', string][] = [
      ['name', account.customer.name],
      ['email', account.customer.email ?? ''],
      ['addressLine', address?.addressLine ?? ''],
      ['landmark', address?.landmark ?? ''],
    ];
    for (const [field, value] of fill) {
      if (value !== '' && !form.getFieldState(field).isDirty) form.setValue(field, value);
    }
    if (!form.getFieldState('phone').isDirty) form.setValue('phone', account.customer.phone);
    if (address && !form.getFieldState('pin').isDirty) {
      const addressPin =
        address.pin ??
        (address.lat !== null && address.lat !== undefined && address.lng !== null && address.lng !== undefined
          ? { lat: address.lat, lng: address.lng }
          : null);
      if (addressPin) form.setValue('pin', addressPin);
    }
  }, [account, form]);

  const changeFulfillment = (next: FulfillmentValue) => {
    form.setValue('fulfillment', next);
    const allowed = allowedPaymentMethods(next, settings, paymentAccounts);
    const current = form.getValues('paymentMethod');
    if (current === null || !allowed.includes(current)) form.setValue('paymentMethod', allowed[0] ?? null);
    place.reset();
  };

  const submit = form.handleSubmit((values) => {
    const input = toOrderInput(values, lines, rules, reward.on);
    if (input === null) return;
    place.mutate(
      { slug: shop.slug, payload: input },
      {
        onSuccess: (placed) => {
          saveRemembered(
            shop.slug,
            values.remember && values.phone !== null ? { name: values.name.trim(), phone: values.phone, email: values.email.trim() } : null,
          );
          onPlaced();
          router.push(`/${shop.slug}/o/${placed.token}?placed=1`);
          clearCart();
        },
        onError: (failure) => {
          if (toApiError(failure).code === 'reward_unavailable') rejectReward();
          else void quote.refetch();
        },
      },
    );
  });

  const sending = place.isPending;
  const blocked = problems.size > 0 || methods.length === 0;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submit(event);
      }}
      // The Place order bar rides above the tab bar on phones (56 px) and at the bottom on desktop.
      className="mx-auto -mb-20 flex w-full max-w-[640px] flex-col gap-8 [--above-dock:calc(3.5rem+env(safe-area-inset-bottom))] lg:mb-0 lg:[--above-dock:0px]"
    >
      <h1 className="text-2xl font-bold tracking-tight">{words.title}</h1>
      {block && (
        <Alert>
          <AlertDescription>{block.alert}</AlertDescription>
        </Alert>
      )}

      <FieldSet className="rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs">
        <FieldLegend className="text-lg font-semibold">{words.how}</FieldLegend>
        <FieldGroup>
          <ToggleGroup
            variant="outline"
            className="w-full"
            value={[fulfillment]}
            onValueChange={(value) => {
              const next = Fulfillment.safeParse(value[0]);
              if (next.success) changeFulfillment(next.data);
            }}
          >
            {fulfillments.map((option) => (
              <ToggleGroupItem key={option} value={option} className={PRESSED}>
                {WORDS.order.fulfillment[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          {fulfillment === 'pickup' && (
            <Field>
              <FieldLabel htmlFor="pickup-at">{words.pickupTime}</FieldLabel>
              <NativeSelect id="pickup-at" className="w-full" {...form.register('pickupAt')}>
                <NativeSelectOption value="">{words.asap}</NativeSelectOption>
                {(['today', 'tomorrow'] as const).map((day) => {
                  const daySlots = slots.filter((slot) => slot.day === day);
                  if (daySlots.length === 0) return null;
                  return (
                    <NativeSelectOptGroup key={day} label={words[day]}>
                      {daySlots.map((slot) => (
                        <NativeSelectOption key={slot.at} value={slot.at}>
                          {slot.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelectOptGroup>
                  );
                })}
              </NativeSelect>
              {slots.length === 0 && <FieldDescription>{words.noSlots}</FieldDescription>}
            </Field>
          )}

          {fulfillment === 'delivery' && (
            <>
              <Field data-invalid={errors.addressLine !== undefined}>
                <FieldLabel htmlFor="address">{words.address}</FieldLabel>
                <Input
                  id="address"
                  autoComplete="street-address"
                  placeholder={words.addressPlaceholder}
                  aria-invalid={errors.addressLine !== undefined}
                  {...form.register('addressLine')}
                />
                <FieldError>{errors.addressLine?.message}</FieldError>
              </Field>

              <div className="flex flex-col gap-2 rounded-xl border border-border/60 bg-shop-10-soft/20 p-3">
                <p className="text-xs text-muted-foreground">{words.locationConsent}</p>
                {pin ? (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <IconCheck className="size-3.5" aria-hidden="true" />
                        {words.pinAdded}
                      </span>
                      {pin.accuracyMeters != null && (
                        <span className="text-xs text-muted-foreground">
                          · {words.pinAccuracy(pin.accuracyMeters)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={mapsLink(pin)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-shop-10 hover:underline"
                      >
                        <IconExternalLink className="size-3" aria-hidden="true" />
                        <span>{WORDS.storefront.receipt.openInMaps}</span>
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePin}
                        className="h-6 px-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        {words.removePin}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={locating}
                      onClick={handleUseLocation}
                      className="self-start gap-1.5 text-xs"
                    >
                      {locating ? <Spinner className="size-3" /> : <IconMapPin className="size-3.5 text-shop-10" aria-hidden="true" />}
                      <span>{words.useCurrentLocation}</span>
                    </Button>
                    {locError && <p className="text-xs text-destructive-text">{locError}</p>}
                  </div>
                )}
              </div>

              <Field>
                <FieldLabel htmlFor="landmark">{words.landmark}</FieldLabel>
                <Input id="landmark" placeholder={words.landmarkPlaceholder} {...form.register('landmark')} />
              </Field>
              {zones.length > 0 ? (
                <Field data-invalid={errors.deliveryZoneId !== undefined}>
                  <FieldLabel htmlFor="zone">{words.zone}</FieldLabel>
                  <NativeSelect id="zone" className="w-full" aria-invalid={errors.deliveryZoneId !== undefined} {...form.register('deliveryZoneId')}>
                    <NativeSelectOption value="">{zoneRequired ? words.chooseZone : words.feeViaMessenger}</NativeSelectOption>
                    {zones.map((zone) => (
                      <NativeSelectOption key={zone.id} value={zone.id}>
                        {words.zoneOption(zone.name, formatPeso(zone.fee))}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError>{errors.deliveryZoneId?.message}</FieldError>
                </Field>
              ) : (
                !zoneRequired && <p className="text-sm text-muted-foreground">{words.feeViaMessengerHint}</p>
              )}
            </>
          )}
        </FieldGroup>
      </FieldSet>

      <FieldSet className="rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs">
        <FieldLegend className="text-lg font-semibold">{words.who}</FieldLegend>
        <FieldGroup>
          <Field data-invalid={errors.name !== undefined}>
            <FieldLabel htmlFor="name">{words.name}</FieldLabel>
            <Input id="name" autoComplete="name" aria-invalid={errors.name !== undefined} {...form.register('name')} />
            <FieldError>{errors.name?.message}</FieldError>
          </Field>
          <Controller
            control={form.control}
            name="phone"
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <PhoneField label={words.phone} name={field.name} value={field.value} onChange={field.onChange} words={WORDS.shared} required />
                {/* PhoneField says a wrong number itself once typed; this covers an empty one on Place order. */}
                {errors.phone && field.value === null && <FieldError>{errors.phone.message}</FieldError>}
              </div>
            )}
          />
          <Field data-invalid={errors.email !== undefined}>
            <FieldLabel htmlFor="email">{words.email}</FieldLabel>
            <Input id="email" type="email" inputMode="email" autoComplete="email" aria-invalid={errors.email !== undefined} {...form.register('email')} />
            <FieldError>{errors.email?.message}</FieldError>
          </Field>
          <Controller
            control={form.control}
            name="remember"
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox id="remember" checked={field.value} onCheckedChange={field.onChange} className={PICKED} />
                <FieldLabel htmlFor="remember" className="font-normal">
                  {words.remember}
                </FieldLabel>
              </Field>
            )}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet className="rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs">
        <FieldLegend className="text-lg font-semibold">{words.pay}</FieldLegend>
        {methods.length === 0 ? (
          <Alert variant="destructive">
            <AlertDescription>{words.noMethods}</AlertDescription>
          </Alert>
        ) : (
          <Controller
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  const next = PaymentMethod.safeParse(value);
                  if (next.success) field.onChange(next.data);
                }}
              >
                {methods.map((method) => (
                  <FieldLabel key={method} htmlFor={`method-${method}`} className={CHOICE_ROW}>
                    <RadioGroupItem id={`method-${method}`} value={method} className={PICKED} />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-semibold">{WORDS.order.method[method]}</span>
                      <span className="text-sm font-normal text-muted-foreground">{methodHint(method, fulfillment)}</span>
                    </span>
                  </FieldLabel>
                ))}
              </RadioGroup>
            )}
          />
        )}
        <FieldError>{errors.paymentMethod?.message}</FieldError>
        {transfer?.success && <TransferAccounts method={transfer.data} amount={total} />}
      </FieldSet>

      <section className="flex flex-col gap-3 rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-5 shadow-xs" aria-labelledby="checkout-summary">
        <h2 id="checkout-summary" className="text-lg font-semibold">
          {words.summary}
        </h2>
        <RewardSwitch />
        <OrderLines
          lines={cart.lines.map((priced) => ({
            itemName: priced.itemName,
            variantName: priced.variantName,
            qty: priced.line.qty,
            lineTotal: priced.lineTotal,
            note: priced.line.note,
            options: priced.options,
          }))}
          totals={
            priced
              ? { subtotal: priced.subtotal, deliveryFee: priced.deliveryFee, discount: priced.discountTotal, total: priced.total }
              : { subtotal: cart.subtotal, total: cart.subtotal }
          }
          words={WORDS.order}
          renderLineActions={(index) => {
            const code = problems.get(index);
            if (code === undefined) return null;
            return (
              <>
                <span className="mr-auto text-sm font-medium text-destructive-text">{errorWords(code, vocab)}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    removeLine(index);
                  }}
                >
                  {words.remove}
                </Button>
              </>
            );
          }}
        />
        {problems.size > 0 && (
          <Alert variant="destructive">
            <AlertDescription>{words.fixProblems}</AlertDescription>
          </Alert>
        )}
      </section>

      <div className="rounded-[var(--radius-card,1.25rem)] border border-border/60 bg-shop-30 p-4 shadow-xs">
        <Controller
          control={form.control}
          name="privacy"
          render={({ field }) => (
            <Field orientation="horizontal" data-invalid={errors.privacy !== undefined} className="items-start">
              <Checkbox id="privacy" checked={field.value} onCheckedChange={field.onChange} aria-invalid={errors.privacy !== undefined} className={cn('mt-0.5', PICKED)} />
              <div className="flex flex-col gap-1">
                <FieldLabel htmlFor="privacy" className="font-normal">
                  {words.privacy(shop.name)}{' '}
                  <Link
                    href={`/${shop.slug}/privacy`}
                    target="_blank"
                    className="font-medium underline underline-offset-4 hover:text-shop-10"
                  >
                    Privacy notice
                  </Link>
                </FieldLabel>
                <FieldError>{errors.privacy?.message}</FieldError>
              </div>
            </Field>
          )}
        />
      </div>

      <StickyActionBar aboveDock className="flex-col items-stretch gap-2">
        {shopError !== null && (
          <p role="alert" className="text-sm font-medium text-destructive-text">
            {errorWords(shopError, vocab)}
          </p>
        )}
        <Button type="submit" size="lg" variant="shop" className="w-full" disabled={!online || sending || blocked}>
          {!online ? (
            WORDS.shared.offlineShort
          ) : sending ? (
            <>
              <Spinner />
              {words.placing}
            </>
          ) : (
            <span className="tabular">{words.place(formatPeso(total))}</span>
          )}
        </Button>
      </StickyActionBar>
    </form>
  );
}

/** Checkout (P4.4): how, who and pay on one page, then Place order. */
export function Checkout() {
  const hydrated = useHydrated();
  const { cart, catalogLabel, storefront } = useShop();
  const [placed, setPlaced] = useState(false);

  if (!hydrated || placed) return <CheckoutSkeleton />;
  if (cart.lines.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia>
            <img src={FLUENT_ICONS['shopping-bags'].url} alt="" className="size-16" />
          </EmptyMedia>
          <EmptyTitle>{WORDS.storefront.cart.empty}</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Link href={`/${storefront.shop.slug}/menu`} className={cn(buttonVariants({ variant: 'outline' }))}>
            {WORDS.storefront.cart.seeCatalog(catalogLabel)}
          </Link>
        </EmptyContent>
      </Empty>
    );
  }
  return (
    <CheckoutForm
      onPlaced={() => {
        setPlaced(true);
      }}
    />
  );
}
