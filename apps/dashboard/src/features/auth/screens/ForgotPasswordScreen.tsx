import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { errorWords, WORDS } from '@smartapp/core';
import { sendPasswordResetCode, useApiClient, useResetPasswordWithCode, useSendPasswordResetCode } from '@smartapp/api';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { toast } from '@smartapp/ui/components/sonner';
import { Spinner } from '@smartapp/ui/components/spinner';

import { AuthPage } from '../components/AuthPage';
import { CodeStep } from '../components/CodeStep';

const words = WORDS.dashboard.auth;

const EmailForm = z.object({ email: z.email() });
const PasswordField = z.string().min(8);

/** Email → 6-digit code + new password, all in the app (no email links). */
export default function ForgotPasswordScreen() {
  const client = useApiClient();
  const navigate = useNavigate();
  const sendCode = useSendPasswordResetCode();
  const reset = useResetPasswordWithCode();
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const form = useForm<z.infer<typeof EmailForm>>({ resolver: zodResolver(EmailForm), defaultValues: { email: '' } });
  const passwordOk = PasswordField.safeParse(newPassword).success;

  const back = (
    <Link to="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
      {words.forgot.backToLogIn}
    </Link>
  );

  if (email !== null) {
    return (
      <AuthPage title={words.verify.title} intro={words.verify.intro(email)} footer={back}>
        <CodeStep
          verifying={reset.isPending}
          error={reset.error}
          onVerify={(code) => {
            setPasswordTouched(true);
            if (!passwordOk) return;
            reset.mutate(
              { email, code, newPassword },
              {
                onSuccess: () => {
                  toast.success(words.forgot.done);
                  void navigate({ to: '/' });
                },
              },
            );
          }}
          onResend={() => sendPasswordResetCode(client, { email })}
        >
          <Field data-invalid={passwordTouched && !passwordOk}>
            <FieldLabel htmlFor="new-password">{words.newPassword}</FieldLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              aria-invalid={passwordTouched && !passwordOk}
              onChange={(event) => {
                setNewPassword(event.target.value);
              }}
              onBlur={() => {
                setPasswordTouched(true);
              }}
            />
            <FieldDescription>{words.passwordHint}</FieldDescription>
          </Field>
        </CodeStep>
      </AuthPage>
    );
  }

  return (
    <AuthPage title={words.forgot.title} intro={words.forgot.intro} footer={back}>
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit((values) => {
            sendCode.mutate(values, {
              onSuccess: () => {
                setEmail(values.email);
              },
            });
          })(event);
        }}
      >
        <FieldGroup>
          <Field data-invalid={form.formState.errors.email !== undefined}>
            <FieldLabel htmlFor="email">{words.email}</FieldLabel>
            <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={form.formState.errors.email !== undefined} {...form.register('email')} />
          </Field>
          {sendCode.error ? <FieldError>{errorWords(sendCode.error.code)}</FieldError> : null}
          <Button type="submit" size="lg" disabled={sendCode.isPending}>
            {sendCode.isPending ? <Spinner /> : null}
            {words.forgot.sendCode}
          </Button>
        </FieldGroup>
      </form>
    </AuthPage>
  );
}
