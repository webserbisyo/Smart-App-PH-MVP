import { useState } from 'react';

import { toApiError, useSetDeliveryInfo } from '@smartapp/api';
import { errorWords, WORDS } from '@smartapp/core';
import type { DeliveryProvider, Order } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@smartapp/ui/components/card';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { NativeSelect, NativeSelectOption } from '@smartapp/ui/components/native-select';
import { Spinner } from '@smartapp/ui/components/spinner';
import { toast } from '@smartapp/ui/components/sonner';
import { useOnline } from '@smartapp/ui/hooks/use-online';
import { IconExternalLink, IconPhone, IconTruckDelivery } from '@smartapp/ui/icons';

import { useVocab } from '../../../app/shop';

const words = WORDS.dashboard.orders.detail.deliveryCard;

function validateTrackingUrl(url: string, provider: DeliveryProvider): string | null {
  const trimmed = url.trim();
  if (trimmed === '') return null;
  if (!/^https:\/\/[^\s/]+\.\S+$/.test(trimmed) || trimmed.length > 500) {
    return words.invalidUrl;
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (provider === 'lalamove' && host !== 'lalamove.com' && !host.endsWith('.lalamove.com')) {
      return words.invalidUrl;
    }
    if (provider === 'grab' && host !== 'grab.com' && !host.endsWith('.grab.com')) {
      return words.invalidUrl;
    }
  } catch {
    return words.invalidUrl;
  }
  return null;
}

function validateRiderPhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (trimmed === '') return null;
  if (!/^(09|\+639)[0-9]{9}$/.test(trimmed)) {
    return words.invalidPhone;
  }
  return null;
}

export function DeliveryCard({ order }: { order: Order }) {
  const vocab = useVocab();
  const online = useOnline();
  const setDelivery = useSetDeliveryInfo();

  const [provider, setProvider] = useState<DeliveryProvider>(order.deliveryProvider ?? 'own');
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl ?? '');
  const [riderName, setRiderName] = useState(order.riderName ?? '');
  const [riderPhone, setRiderPhone] = useState(order.riderPhone ?? '');
  const [tried, setTried] = useState(false);

  const urlError = tried ? validateTrackingUrl(trackingUrl, provider) : null;
  const phoneError = tried ? validateRiderPhone(riderPhone) : null;
  const isInvalid = urlError !== null || phoneError !== null;

  const handleSave = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setTried(true);
    const urlErr = validateTrackingUrl(trackingUrl, provider);
    const phoneErr = validateRiderPhone(riderPhone);
    if (urlErr !== null || phoneErr !== null || setDelivery.isPending) return;

    setDelivery.mutate(
      {
        orderId: order.id,
        provider,
        trackingUrl: trackingUrl.trim() === '' ? null : trackingUrl.trim(),
        riderName: riderName.trim() === '' ? null : riderName.trim(),
        riderPhone: riderPhone.trim() === '' ? null : riderPhone.trim(),
      },
      {
        onSuccess: () => {
          toast.success(words.saved);
        },
        onError: (err) => {
          toast.error(errorWords(toApiError(err).code, vocab));
        },
      },
    );
  };

  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <IconTruckDelivery className="size-4 text-muted-foreground" aria-hidden="true" />
          <span>{words.title}</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {order.trackingUrl && (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconExternalLink className="size-3.5" aria-hidden="true" />
              <span>{words.openTracking}</span>
            </a>
          )}
          {order.riderPhone && (
            <a
              href={`tel:${order.riderPhone}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <IconPhone className="size-3.5" aria-hidden="true" />
              <span>{words.callRider}</span>
            </a>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="delivery-provider">{words.provider}</FieldLabel>
            <NativeSelect
              id="delivery-provider"
              value={provider}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'own' || val === 'lalamove' || val === 'grab' || val === 'other') {
                  setProvider(val);
                }
              }}
              disabled={!online || setDelivery.isPending}
            >
              <NativeSelectOption value="own">{words.providers.own}</NativeSelectOption>
              <NativeSelectOption value="lalamove">{words.providers.lalamove}</NativeSelectOption>
              <NativeSelectOption value="grab">{words.providers.grab}</NativeSelectOption>
              <NativeSelectOption value="other">{words.providers.other}</NativeSelectOption>
            </NativeSelect>
          </Field>

          <Field data-invalid={urlError !== null || undefined}>
            <FieldLabel htmlFor="tracking-url">{words.trackingUrl}</FieldLabel>
            <Input
              id="tracking-url"
              type="url"
              inputMode="url"
              placeholder={words.trackingUrlPlaceholder}
              value={trackingUrl}
              aria-invalid={urlError !== null}
              onChange={(e) => {
                setTrackingUrl(e.target.value);
              }}
              disabled={!online || setDelivery.isPending}
            />
            {urlError ? (
              <FieldError>{urlError}</FieldError>
            ) : (
              <FieldDescription>
                {provider === 'lalamove'
                  ? 'Must be a valid lalamove.com link'
                  : provider === 'grab'
                    ? 'Must be a valid grab.com link'
                    : 'Customer can tap this to track delivery live'}
              </FieldDescription>
            )}
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="rider-name">{words.riderName}</FieldLabel>
              <Input
                id="rider-name"
                maxLength={60}
                placeholder={words.riderNamePlaceholder}
                value={riderName}
                onChange={(e) => {
                  setRiderName(e.target.value);
                }}
                disabled={!online || setDelivery.isPending}
              />
            </Field>

            <Field data-invalid={phoneError !== null || undefined}>
              <FieldLabel htmlFor="rider-phone">{words.riderPhone}</FieldLabel>
              <Input
                id="rider-phone"
                type="tel"
                inputMode="tel"
                placeholder={words.riderPhonePlaceholder}
                value={riderPhone}
                aria-invalid={phoneError !== null}
                onChange={(e) => {
                  setRiderPhone(e.target.value);
                }}
                disabled={!online || setDelivery.isPending}
              />
              {phoneError && <FieldError>{phoneError}</FieldError>}
            </Field>
          </div>

          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={!online || isInvalid || setDelivery.isPending}
            className="self-end mt-1 font-semibold"
          >
            {setDelivery.isPending ? (
              <>
                <Spinner className="size-3.5 mr-1" />
                <span>{words.saving}</span>
              </>
            ) : (
              words.save
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
