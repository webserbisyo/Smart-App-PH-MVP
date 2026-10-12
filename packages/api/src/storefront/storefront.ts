import { Slug, Storefront } from '@smartapp/core';

import type { ApiClient } from '../client';
import { ApiError, toApiError } from '../errors';

/** What `get_storefront` returns, checked with the core schema; a mismatch is a bug, so it fails loudly. */
export function storefrontFromJson(data: unknown): Storefront {
  const result = Storefront.safeParse(data);
  if (!result.success) throw new ApiError('unknown', result.error.message);
  return result.data;
}

/**
 * Everything a shop page shows, in one call. `null` for a link that is not an active shop (unknown, pending or
 * suspended): the page shows not found.
 */
export async function getStorefront(client: ApiClient, slug: string): Promise<Storefront | null> {
  if (!Slug.safeParse(slug).success) return null;
  const { data, error } = await client.rpc('get_storefront', { p_slug: slug });
  if (error) {
    const failure = toApiError(error);
    if (failure.code === 'shop_not_found') return null;
    throw failure;
  }
  return storefrontFromJson(data);
}
