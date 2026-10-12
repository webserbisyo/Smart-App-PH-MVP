import { describe, expect, it } from 'vitest';

import { ApiError, toApiError } from './errors';

describe('toApiError', () => {
  it('reads database codes from the message', () => {
    expect(toApiError({ message: 'slug_taken', code: 'P0001' }).code).toBe('slug_taken');
    expect(toApiError({ message: 'already_has_shop' }).code).toBe('already_has_shop');
  });

  it('maps Supabase Auth codes', () => {
    expect(toApiError({ message: 'Invalid login credentials', code: 'invalid_credentials' }).code).toBe('wrong_password');
    expect(toApiError({ message: 'Token has expired or is invalid', code: 'otp_expired' }).code).toBe('invalid_code');
    expect(toApiError({ message: 'x', code: 'over_email_send_rate_limit' }).code).toBe('rate_limited');
    expect(toApiError({ message: 'x', code: 'weak_password' }).code).toBe('weak_password');
    expect(toApiError({ message: 'x', code: 'email_exists' }).code).toBe('email_taken');
  });

  it('maps permission denied to not_signed_in', () => {
    expect(toApiError({ message: 'permission denied for function create_my_shop', code: '42501' }).code).toBe('not_signed_in');
  });

  it('maps a row-level security refusal to not_allowed', () => {
    const error = { message: 'new row violates row-level security policy for table "categories"', code: '42501' };
    expect(toApiError(error).code).toBe('not_allowed');
  });

  it('maps broken database rules to invalid', () => {
    expect(toApiError({ message: 'violates check constraint', code: '23514' }).code).toBe('invalid');
    expect(toApiError({ message: 'violates foreign key constraint', code: '23503' }).code).toBe('invalid');
  });

  it('reads an expired code without a code field', () => {
    expect(toApiError({ message: 'Token has expired or is invalid' }).code).toBe('invalid_code');
  });

  it('maps network failures', () => {
    expect(toApiError(new TypeError('Failed to fetch')).code).toBe('network');
  });

  it('keeps an ApiError and makes anything else unknown', () => {
    const error = new ApiError('slug_invalid');
    expect(toApiError(error)).toBe(error);
    const unknown = toApiError({ message: 'boom' });
    expect(unknown.code).toBe('unknown');
    expect(unknown.detail).toBe('boom');
    expect(toApiError(null).code).toBe('unknown');
    expect(toApiError('text').code).toBe('unknown');
  });
});
