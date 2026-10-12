import { z } from 'zod';

import type { Vocab } from '../vocab';
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
  'variant_required',
  'category_not_empty',
  'item_has_orders',
  'not_allowed',
  'shop_not_found',
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

type VocabErrorCode = keyof typeof WORDS.vocabErrors;

function hasVocabWords(code: ApiErrorCode): code is VocabErrorCode {
  return Object.hasOwn(WORDS.vocabErrors, code);
}

/** The words for an error code; with the shop's vocab, codes about the catalog say "menu item" or "product". */
export function errorWords(code: ApiErrorCode, vocab?: Vocab): string {
  if (vocab && hasVocabWords(code)) return WORDS.vocabErrors[code](vocab.item.toLowerCase());
  return WORDS.errors[code];
}
