import { ApiErrorCode } from '@smartapp/core';

/** Every failure from packages/api: a code the apps turn into words with `errorWords`. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly detail: string | null;

  constructor(code: ApiErrorCode, detail: string | null = null) {
    super(code);
    this.name = 'ApiError';
    this.code = code;
    this.detail = detail;
  }
}

/** Supabase Auth error codes (AuthError.code) and what the apps show for them. */
const AUTH_CODES: Readonly<Record<string, ApiErrorCode>> = {
  // Supabase uses otp_expired for a wrong code and for an old one alike.
  otp_expired: 'invalid_code',
  invalid_credentials: 'wrong_password',
  email_exists: 'email_taken',
  user_already_exists: 'email_taken',
  email_not_confirmed: 'email_not_confirmed',
  weak_password: 'weak_password',
  over_email_send_rate_limit: 'rate_limited',
  over_request_rate_limit: 'rate_limited',
  over_sms_send_rate_limit: 'rate_limited',
};

function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null) return undefined;
  const found: unknown = Reflect.get(value, key);
  return found;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Any thrown or returned error → ApiError. Database functions raise `raise exception '<code>'`, which arrives
 * as the message; Supabase Auth errors carry a `code`. Anything else is `unknown`.
 */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const message = text(field(error, 'message'));
  const code = text(field(error, 'code'));

  if (message !== null) {
    const fromDatabase = ApiErrorCode.safeParse(message);
    if (fromDatabase.success) return new ApiError(fromDatabase.data);
  }
  if (code !== null) {
    const fromAuth = AUTH_CODES[code];
    if (fromAuth !== undefined) return new ApiError(fromAuth);
    // Postgres: 42501 is "permission denied"; the caller is not signed in or not allowed.
    if (code === '42501') return new ApiError('not_signed_in');
  }
  // verifyOtp says "Token has expired or is invalid" without a stable code on older servers.
  if (message !== null && /token has expired or is invalid/i.test(message)) return new ApiError('invalid_code');
  if (message !== null && /failed to fetch|network/i.test(message)) return new ApiError('network');
  return new ApiError('unknown', message);
}

/** Throws the error from a Supabase `{ error }` result as an ApiError. */
export function throwIfError(error: unknown): void {
  if (error !== null && error !== undefined) throw toApiError(error);
}

// Every query and mutation error in the apps is an ApiError (hooks throw only ApiError).
declare module '@tanstack/react-query' {
  interface Register {
    defaultError: ApiError;
  }
}
