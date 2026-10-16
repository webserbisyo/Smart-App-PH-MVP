'use client';

import { useState } from 'react';

import { toApiError, useRemoveMyAddress, useSaveMyAddress } from '@smartapp/api';
import { errorWords, WORDS } from '@smartapp/core';
import type { CustomerAddress, MemberAccount } from '@smartapp/core';
import { Badge } from '@smartapp/ui/components/badge';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';
import { toast } from '@smartapp/ui/components/sonner';
import { Spinner } from '@smartapp/ui/components/spinner';
import { IconMapPin, IconPencil, IconPlus } from '@smartapp/ui/icons';

const words = WORDS.storefront.account;
/** The database keeps at most 5 addresses per member. */
const MAX_ADDRESSES = 5;
const SHOP_BUTTON = 'bg-shop-10 text-shop-10-foreground hover:bg-shop-10/90 active:bg-shop-10/80';

/** Add or edit one address; editing can also remove it. */
function AddressForm({ slug, account, address, onDone }: { slug: string; account: MemberAccount; address: CustomerAddress | null; onDone: () => void }) {
  const save = useSaveMyAddress(slug);
  const remove = useRemoveMyAddress(slug);
  const [label, setLabel] = useState(address?.label ?? '');
  const [line, setLine] = useState(address?.addressLine ?? '');
  const [landmark, setLandmark] = useState(address?.landmark ?? '');
  const [tried, setTried] = useState(false);
  const failure = save.error ?? remove.error;
  const busy = save.isPending || remove.isPending;
  const lineMissing = line.trim() === '';

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (lineMissing) return;
        const name = label.trim();
        save.mutate(
          {
            id: address?.id ?? null,
            tenantId: account.customer.tenantId,
            customerId: account.customer.id,
            label: name === '' ? words.addressLabelPlaceholder : name.slice(0, 40),
            addressLine: line.trim(),
            landmark: landmark.trim() === '' ? null : landmark.trim(),
            isDefault: address?.isDefault ?? account.addresses.length === 0,
          },
          {
            onSuccess: () => {
              toast.success(words.saved);
              onDone();
            },
          },
        );
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="address-label">{words.addressLabel}</FieldLabel>
          <Input
            id="address-label"
            maxLength={40}
            placeholder={words.addressLabelPlaceholder}
            value={label}
            onChange={(event) => {
              setLabel(event.target.value);
            }}
          />
        </Field>
        <Field data-invalid={(tried && lineMissing) || undefined}>
          <FieldLabel htmlFor="address-line">{words.addressLine}</FieldLabel>
          <Input
            id="address-line"
            autoComplete="street-address"
            maxLength={200}
            placeholder={WORDS.storefront.checkout.addressPlaceholder}
            aria-invalid={tried && lineMissing}
            value={line}
            onChange={(event) => {
              setLine(event.target.value);
            }}
          />
          {tried && lineMissing ? <FieldError>{WORDS.storefront.checkout.required.address}</FieldError> : null}
        </Field>
        <Field>
          <FieldLabel htmlFor="address-landmark">{words.landmark}</FieldLabel>
          <Input
            id="address-landmark"
            maxLength={200}
            placeholder={WORDS.storefront.checkout.landmarkPlaceholder}
            value={landmark}
            onChange={(event) => {
              setLandmark(event.target.value);
            }}
          />
        </Field>
        {failure ? (
          <p role="alert" className="text-sm font-medium text-destructive-text">
            {errorWords(toApiError(failure).code)}
          </p>
        ) : null}
        <Button type="submit" size="lg" className={SHOP_BUTTON} disabled={busy}>
          {save.isPending ? <Spinner /> : null}
          {words.save}
        </Button>
        {address !== null && (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive-text"
            disabled={busy}
            onClick={() => {
              remove.mutate(address.id, {
                onSuccess: () => {
                  toast.success(words.removed);
                  onDone();
                },
              });
            }}
          >
            {words.removeAddress}
          </Button>
        )}
      </FieldGroup>
    </form>
  );
}

/** The member's saved addresses (checkout fills in the default one), each with Edit, and Add address. */
export function SavedAddresses({ slug, account }: { slug: string; account: MemberAccount }) {
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  const [open, setOpen] = useState(false);
  const addresses = account.addresses.toSorted((a, b) => Number(b.isDefault) - Number(a.isDefault));

  const openForm = (address: CustomerAddress | null) => {
    setEditing(address);
    setOpen(true);
  };

  return (
    <section aria-labelledby="account-address" className="flex flex-col gap-3">
      <h2 id="account-address" className="text-lg font-semibold">
        {words.address}
      </h2>
      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{words.addressEmpty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {addresses.map((address) => (
            <li key={address.id} className="flex items-start gap-3 rounded-xl border p-3">
              <IconMapPin aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-2 font-semibold">
                  <span className="truncate">{address.label}</span>
                  {address.isDefault && <Badge variant="secondary">{words.defaultBadge}</Badge>}
                </span>
                <span className="text-sm break-words">{address.addressLine}</span>
                {address.landmark !== null && <span className="text-sm break-words text-muted-foreground">{address.landmark}</span>}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={words.editNamed(address.label)}
                onClick={() => {
                  openForm(address);
                }}
              >
                <IconPencil />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {addresses.length < MAX_ADDRESSES && (
        <Button
          variant="outline"
          className="self-start"
          onClick={() => {
            openForm(null);
          }}
        >
          <IconPlus aria-hidden="true" />
          {words.addAddress}
        </Button>
      )}
      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent className="gap-4 px-4 pb-4 sm:max-w-md">
          <ResponsiveDialogHeader className="px-0 text-left">
            <ResponsiveDialogTitle>{editing === null ? words.addAddress : words.editAddress}</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>
          <AddressForm
            key={editing?.id ?? 'new'}
            slug={slug}
            account={account}
            address={editing}
            onDone={() => {
              setOpen(false);
            }}
          />
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </section>
  );
}
