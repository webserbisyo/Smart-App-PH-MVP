import type { ApiClient } from './client';
import { ApiError, throwIfError } from './errors';

/** Input parsed with its core schema; anything that does not fit is `invalid` before it reaches the database. */
export function parsed<T>(result: { success: true; data: T } | { success: false }): T {
  if (!result.success) throw new ApiError('invalid');
  return result.data;
}

interface Parser<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false; error: { message: string } };
}

/** A database function's result checked with its core schema; a mismatch is a bug, so it fails loudly. */
export function fromJson<T>(schema: Parser<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) throw new ApiError('unknown', result.error.message);
  return result.data;
}

/** Trimmed text, or null when empty. */
export function blankToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed === '' ? null : trimmed;
}

/** The `sort` for a new row: after every row the shop already has. */
export async function nextSort(
  client: ApiClient,
  table: 'payment_accounts' | 'delivery_zones' | 'categories' | 'shop_banners',
  tenantId: string,
): Promise<number> {
  const { data, error } = await client
    .from(table)
    .select('sort')
    .eq('tenant_id', tenantId)
    .order('sort', { ascending: false })
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return data === null ? 0 : data.sort + 1;
}

/** The row of a `.single()` result: its error thrown as an ApiError, a missing row as `unknown`. */
export function must<T>(result: { data: T; error: unknown }): NonNullable<T> {
  throwIfError(result.error);
  if (result.data === null || result.data === undefined) throw new ApiError('unknown');
  return result.data;
}
