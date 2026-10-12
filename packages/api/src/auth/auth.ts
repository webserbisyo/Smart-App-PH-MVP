import type { ApiClient } from '../client';
import { ApiError, throwIfError } from '../errors';

/** Who is signed in, as the apps see it. */
export interface Session {
  userId: string;
  email: string;
}

/** Owner sign-up. Supabase emails a 6-digit code; the name is kept as the profile's display name. */
export async function signUpOwner(client: ApiClient, input: { name: string; email: string; password: string }): Promise<void> {
  const { data, error } = await client.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { display_name: input.name } },
  });
  throwIfError(error);
  // An email that already has an account gets no code and a user with no identities (no error, by design).
  if (data.user?.identities?.length === 0) throw new ApiError('email_taken');
}

/** The sign-up code: confirms the email and signs in. */
export async function verifyEmailCode(client: ApiClient, input: { email: string; code: string }): Promise<void> {
  const { error } = await client.auth.verifyOtp({ email: input.email, token: input.code, type: 'email' });
  throwIfError(error);
}

/** Sends the sign-up code again (the hosted limit is one email a minute). */
export async function resendEmailCode(client: ApiClient, input: { email: string }): Promise<void> {
  const { error } = await client.auth.resend({ email: input.email, type: 'signup' });
  throwIfError(error);
}

export async function signIn(client: ApiClient, input: { email: string; password: string }): Promise<void> {
  const { error } = await client.auth.signInWithPassword({ email: input.email, password: input.password });
  throwIfError(error);
}

export async function signOut(client: ApiClient): Promise<void> {
  const { error } = await client.auth.signOut();
  throwIfError(error);
}

/** Forgot password, step 1: emails a 6-digit code (no links). */
export async function sendPasswordResetCode(client: ApiClient, input: { email: string }): Promise<void> {
  const { error } = await client.auth.resetPasswordForEmail(input.email);
  throwIfError(error);
}

/** Forgot password, step 2: the code signs in, then the new password is saved. */
export async function resetPasswordWithCode(
  client: ApiClient,
  input: { email: string; code: string; newPassword: string },
): Promise<void> {
  const verified = await client.auth.verifyOtp({ email: input.email, token: input.code, type: 'recovery' });
  throwIfError(verified.error);
  const { error } = await client.auth.updateUser({ password: input.newPassword });
  throwIfError(error);
}

/** Storefront: emails a 6-digit sign-in code; a new email becomes a customer login. */
export async function sendCustomerCode(client: ApiClient, input: { email: string }): Promise<void> {
  const { error } = await client.auth.signInWithOtp({ email: input.email, options: { shouldCreateUser: true } });
  throwIfError(error);
}

/** Storefront: the sign-in code. */
export async function verifyCustomerCode(client: ApiClient, input: { email: string; code: string }): Promise<void> {
  const { error } = await client.auth.verifyOtp({ email: input.email, token: input.code, type: 'email' });
  throwIfError(error);
}

/** The signed-in user from this device's session, or null. Server code uses `getClaims` instead. */
export async function getSession(client: ApiClient): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();
  throwIfError(error);
  const user = data.session?.user;
  if (!user?.email) return null;
  return { userId: user.id, email: user.email };
}

/** Server code: the user from verified JWT claims, or null. A cookie session is never trusted on its own. */
export async function getVerifiedUser(client: ApiClient): Promise<Session | null> {
  const { data, error } = await client.auth.getClaims();
  if (error !== null || data === null) return null;
  const { sub, email } = data.claims;
  if (typeof email !== 'string' || email.length === 0) return null;
  return { userId: sub, email };
}
