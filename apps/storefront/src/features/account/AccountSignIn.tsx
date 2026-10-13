'use client';

import { useId, useState } from 'react';

import { toApiError, useSendCustomerCode, useVerifyCustomerCode } from '@smartapp/api';
import type { ApiError } from '@smartapp/api';
import { errorWords, WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Spinner } from '@smartapp/ui/components/spinner';
import { useCountdown } from '@smartapp/ui/hooks/use-countdown';
import { CodeInput } from '@smartapp/ui/patterns/CodeInput';

const words = WORDS.storefront.account;
const auth = WORDS.dashboard.auth;

/**
 * Email → 6-digit code. A new email becomes a customer login; nothing here creates shop rows. Used by the join
 * sheet (P4.6); `onSignedIn` runs once the code is accepted.
 */
export function AccountSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const sendCode = useSendCustomerCode();
  const verifyCode = useVerifyCustomerCode();
  const id = useId();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const wait = useCountdown(resendAt);

  async function run(task: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (failure) {
      setError(toApiError(failure));
    } finally {
      setBusy(false);
    }
  }

  const send = (to: string) =>
    run(async () => {
      await sendCode.mutateAsync({ email: to });
      setSentTo(to);
      setResendAt(Date.now() + 60_000);
    });

  const verify = (value: string) => {
    if (sentTo === null) return;
    void run(async () => {
      await verifyCode.mutateAsync({ email: sentTo, code: value });
      onSignedIn();
    });
  };

  if (sentTo === null) {
    return (
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (email.includes('@')) void send(email.trim());
        }}
      >
        <FieldGroup>
          <p className="text-muted-foreground">{words.signInIntro}</p>
          <Field data-invalid={error !== null}>
            <FieldLabel htmlFor={`${id}-email`}>{auth.email}</FieldLabel>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
            {error ? <FieldError>{errorWords(error.code)}</FieldError> : null}
          </Field>
          <Button type="submit" size="lg" disabled={busy || !email.includes('@')}>
            {busy ? <Spinner /> : null}
            {words.sendCode}
          </Button>
        </FieldGroup>
      </form>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) verify(code);
      }}
    >
      <FieldGroup>
        <Field data-invalid={error !== null}>
          <FieldLabel htmlFor={`${id}-code`}>{auth.code}</FieldLabel>
          <FieldDescription>{auth.verify.intro(sentTo)}</FieldDescription>
          <CodeInput id={`${id}-code`} label={auth.code} value={code} onChange={setCode} onComplete={verify} disabled={busy} invalid={error !== null} />
          {error ? <FieldError>{errorWords(error.code)}</FieldError> : null}
        </Field>
        <Button type="submit" size="lg" disabled={busy || code.length !== 6}>
          {busy ? <Spinner /> : null}
          {words.verify}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy || wait > 0}
          onClick={() => {
            void send(sentTo);
          }}
        >
          {wait > 0 ? auth.verify.resendIn(wait) : auth.verify.resend}
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={() => {
            setSentTo(null);
            setCode('');
            setError(null);
          }}
        >
          {auth.verify.back}
        </Button>
      </FieldGroup>
    </form>
  );
}
