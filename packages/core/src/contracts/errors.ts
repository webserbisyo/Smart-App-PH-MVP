import { z } from 'zod';

import { WORDS } from '../words';

// Every failure the apps can show. Database functions raise these codes (`raise exception '<code>'`), and
// packages/api maps Supabase Auth errors to them. Later slices add their codes here (docs/api-surface.md).
export const API_ERROR_CODES = [
  // database functions
  'not_signed_in',
  'already_has_shop',
  'invalid',
  'slug_invalid',
  'slug_reserved',
  'slug_taken',
  // auth
  'invalid_code',
  'code_expired',
  'email_taken',
  'email_not_confirmed',
  'weak_password',
  'wrong_password',
  'rate_limited',
  // anything else
  'network',
  'unknown',
] as const;
export const ApiErrorCode = z.enum(API_ERROR_CODES);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

/** The words for an error code. Later slices add a `vocab` argument for codes that name the catalog. */
export function errorWords(code: ApiErrorCode): string {
  return WORDS.errors[code];
}
