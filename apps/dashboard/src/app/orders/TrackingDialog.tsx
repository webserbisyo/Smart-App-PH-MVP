import { useState } from 'react';

import { WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@smartapp/ui/components/responsive-dialog';

const words = WORDS.dashboard.orders.trackingDialog;

/** The same rule as advance_order: https, at most 500 characters. */
export function trackingLinkOk(link: string): boolean {
  return link.length <= 500 && /^https:\/\/[^\s/]+\.\S+$/.test(link);
}

function TrackingForm({ onSend }: { onSend: (trackingUrl: string | null) => void }) {
  const [link, setLink] = useState('');
  const [tried, setTried] = useState(false);
  const trimmed = link.trim();
  const invalid = tried && trimmed !== '' && !trackingLinkOk(trimmed);
  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (trimmed !== '' && !trackingLinkOk(trimmed)) return;
        onSend(trimmed === '' ? null : trimmed);
      }}
    >
      <ResponsiveDialogHeader>
        <ResponsiveDialogTitle>{words.title}</ResponsiveDialogTitle>
      </ResponsiveDialogHeader>
      <div className="px-4 pb-2 sm:px-0">
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="tracking-link">{words.link}</FieldLabel>
          <Input
            id="tracking-link"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://"
            value={link}
            aria-invalid={invalid}
            onChange={(event) => {
              setLink(event.target.value);
            }}
          />
          {invalid ? <FieldError>{words.invalid}</FieldError> : <FieldDescription>{words.hint}</FieldDescription>}
        </Field>
      </div>
      <ResponsiveDialogFooter>
        <Button type="submit" size="lg">
          {words.confirm}
        </Button>
      </ResponsiveDialogFooter>
    </form>
  );
}

/** Out for delivery: an optional tracking link the customer sees on the receipt. */
export function TrackingDialog({ open, onClose, onSend }: { open: boolean; onClose: () => void; onSend: (trackingUrl: string | null) => void }) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <ResponsiveDialogContent className="sm:max-w-md">{open ? <TrackingForm onSend={onSend} /> : null}</ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
