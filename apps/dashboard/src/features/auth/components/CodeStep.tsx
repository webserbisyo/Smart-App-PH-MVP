import { useState } from 'react';
import type { ReactNode } from 'react';

import { errorWords, WORDS } from '@smartapp/core';
import { toApiError } from '@smartapp/api';
import type { ApiError } from '@smartapp/api';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Spinner } from '@smartapp/ui/components/spinner';
import { useCountdown } from '@smartapp/ui/hooks/use-countdown';
import { CodeInput } from '@smartapp/ui/patterns/CodeInput';

const words = WORDS.dashboard.auth;

/** "Enter the code": six boxes, Verify, and Send again after 60 s (the hosted limit is one email a minute). */
export function CodeStep({
  onVerify,
  onResend,
  verifying,
  error,
  children,
}: {
  onVerify: (code: string) => void;
  onResend: () => Promise<void>;
  verifying: boolean;
  error: ApiError | null;
  children?: ReactNode;
}) {
  const [code, setCode] = useState('');
  const [resendAt, setResendAt] = useState(() => Date.now() + 60_000);
  const [resendError, setResendError] = useState<ApiError | null>(null);
  const [resent, setResent] = useState(false);
  const wait = useCountdown(resendAt);
  const shown = error ?? resendError;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (code.length === 6) onVerify(code);
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="code">{words.code}</FieldLabel>
          <CodeInput id="code" label={words.code} value={code} onChange={setCode} onComplete={onVerify} disabled={verifying} invalid={shown !== null} />
          {shown ? <FieldError>{errorWords(shown.code)}</FieldError> : null}
          {resent && !shown ? <p className="text-sm text-muted-foreground">{words.verify.resent}</p> : null}
        </Field>
        {children}
        <Button type="submit" size="lg" disabled={verifying || code.length !== 6}>
          {verifying ? <Spinner /> : null}
          {words.verify.submit}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={wait > 0}
          onClick={() => {
            setResendError(null);
            setResent(false);
            onResend().then(
              () => {
                setResent(true);
                setResendAt(Date.now() + 60_000);
              },
              (failure: unknown) => {
                setResendError(toApiError(failure));
              },
            );
          }}
        >
          {wait > 0 ? words.verify.resendIn(wait) : words.verify.resend}
        </Button>
      </FieldGroup>
    </form>
  );
}
