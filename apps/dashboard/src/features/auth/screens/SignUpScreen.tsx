import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { errorWords, WORDS } from '@smartapp/core';
import { resendEmailCode, useApiClient, useSignUpOwner, useVerifyEmailCode } from '@smartapp/api';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Spinner } from '@smartapp/ui/components/spinner';

import { AuthPage } from '../components/AuthPage';
import { CodeStep } from '../components/CodeStep';

const words = WORDS.dashboard.auth;

const SignUpForm = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  password: z.string().min(8, words.passwordHint),
});
type SignUpForm = z.infer<typeof SignUpForm>;

/** Sign up, then the 6-digit code. A verified code signs in; the guard then opens Setup. */
export default function SignUpScreen() {
  const client = useApiClient();
  const signUp = useSignUpOwner();
  const verify = useVerifyEmailCode();
  const [email, setEmail] = useState<string | null>(null);
  const form = useForm<SignUpForm>({ resolver: zodResolver(SignUpForm), defaultValues: { name: '', email: '', password: '' } });
  const { errors } = form.formState;

  if (email !== null) {
    return (
      <AuthPage title={words.verify.title} intro={words.verify.intro(email)}>
        <CodeStep
          verifying={verify.isPending}
          error={verify.error}
          onVerify={(code) => {
            verify.mutate({ email, code });
          }}
          onResend={() => resendEmailCode(client, { email })}
        >
          <Button
            type="button"
            variant="link"
            onClick={() => {
              verify.reset();
              setEmail(null);
            }}
          >
            {words.verify.back}
          </Button>
        </CodeStep>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title={words.signUp.title}
      intro={words.signUp.intro}
      footer={
        <>
          {words.signUp.haveAccount}{' '}
          <Link to="/login" className="font-semibold text-foreground underline-offset-4 hover:underline">
            {words.signUp.logIn}
          </Link>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit((values) => {
            signUp.mutate(values, {
              onSuccess: () => {
                setEmail(values.email);
              },
            });
          })(event);
        }}
      >
        <FieldGroup>
          <Field data-invalid={errors.name !== undefined}>
            <FieldLabel htmlFor="name">{words.name}</FieldLabel>
            <Input id="name" autoComplete="name" aria-invalid={errors.name !== undefined} {...form.register('name')} />
          </Field>
          <Field data-invalid={errors.email !== undefined}>
            <FieldLabel htmlFor="email">{words.email}</FieldLabel>
            <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={errors.email !== undefined} {...form.register('email')} />
          </Field>
          <Field data-invalid={errors.password !== undefined}>
            <FieldLabel htmlFor="password">{words.password}</FieldLabel>
            <Input id="password" type="password" autoComplete="new-password" aria-invalid={errors.password !== undefined} {...form.register('password')} />
            <FieldDescription>{words.passwordHint}</FieldDescription>
          </Field>
          {signUp.error ? (
            <FieldError>
              {signUp.error.code === 'email_taken' ? (
                <>
                  {words.signUp.emailTaken}{' '}
                  <Link to="/forgot-password" className="underline">
                    {words.logIn.forgot}
                  </Link>
                </>
              ) : (
                errorWords(signUp.error.code)
              )}
            </FieldError>
          ) : null}
          <Button type="submit" size="lg" disabled={signUp.isPending}>
            {signUp.isPending ? <Spinner /> : null}
            {words.signUp.submit}
          </Button>
        </FieldGroup>
      </form>
    </AuthPage>
  );
}
