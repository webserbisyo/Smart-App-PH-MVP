import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { errorWords, WORDS } from '@smartapp/core';
import { useSignIn } from '@smartapp/api';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@smartapp/ui/components/field';
import { Input } from '@smartapp/ui/components/input';
import { Spinner } from '@smartapp/ui/components/spinner';

import { AuthPage } from '../components/AuthPage';

const words = WORDS.dashboard.auth;

const LogInForm = z.object({ email: z.email(), password: z.string().min(1) });
type LogInForm = z.infer<typeof LogInForm>;

/** Email and password. After signing in, the guard sends the owner to `?redirect=` or Home. */
export default function LoginScreen() {
  const signIn = useSignIn();
  const form = useForm<LogInForm>({ resolver: zodResolver(LogInForm), defaultValues: { email: '', password: '' } });
  const { errors } = form.formState;

  return (
    <AuthPage
      title={words.logIn.title}
      intro={words.logIn.intro}
      footer={
        <>
          {words.logIn.noAccount}{' '}
          <Link to="/signup" className="font-semibold text-foreground underline-offset-4 hover:underline">
            {words.logIn.signUp}
          </Link>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit((values) => {
            signIn.mutate(values);
          })(event);
        }}
      >
        <FieldGroup>
          <Field data-invalid={errors.email !== undefined}>
            <FieldLabel htmlFor="email">{words.email}</FieldLabel>
            <Input id="email" type="email" autoComplete="email" inputMode="email" aria-invalid={errors.email !== undefined} {...form.register('email')} />
          </Field>
          <Field data-invalid={errors.password !== undefined}>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">{words.password}</FieldLabel>
              <Link to="/forgot-password" className="ml-auto text-sm underline-offset-4 hover:underline">
                {words.logIn.forgot}
              </Link>
            </div>
            <Input id="password" type="password" autoComplete="current-password" aria-invalid={errors.password !== undefined} {...form.register('password')} />
          </Field>
          {signIn.error ? <FieldError>{errorWords(signIn.error.code)}</FieldError> : null}
          <Button type="submit" size="lg" disabled={signIn.isPending}>
            {signIn.isPending ? <Spinner /> : null}
            {words.logIn.submit}
          </Button>
        </FieldGroup>
      </form>
    </AuthPage>
  );
}
