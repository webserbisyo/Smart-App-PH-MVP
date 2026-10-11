import { dbFunctions } from '@smartapp/core';
import type { BusinessType, Tenant } from '@smartapp/core';

import type { ApiClient } from '../client';
import { ApiError, throwIfError } from '../errors';

import { tenantFromRow } from './mappers';

/** The signed-in owner's shop (their active membership), or null when they have none yet. */
export async function getMyShop(client: ApiClient): Promise<Tenant | null> {
  const { data: auth } = await client.auth.getSession();
  const userId = auth.session?.user.id;
  if (userId === undefined) return null;
  const { data, error } = await client
    .from('tenant_members')
    .select('tenants (*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();
  throwIfError(error);
  return data?.tenants ? tenantFromRow(data.tenants) : null;
}

/** Shop setup: creates a pending shop for the signed-in owner. */
export async function createMyShop(
  client: ApiClient,
  input: { businessType: BusinessType; name: string; slug: string },
): Promise<Tenant> {
  const args = dbFunctions.create_my_shop.input.safeParse(input);
  if (!args.success) throw new ApiError('invalid');
  const { data, error } = await client.rpc('create_my_shop', {
    p_business_type: args.data.businessType,
    p_name: args.data.name,
    p_slug: args.data.slug,
  });
  throwIfError(error);
  if (data === null) throw new ApiError('unknown');
  return tenantFromRow(data);
}

/** False for an invalid, reserved or taken link name. */
export async function slugAvailable(client: ApiClient, slug: string): Promise<boolean> {
  const { data, error } = await client.rpc('slug_available', { p_slug: slug });
  throwIfError(error);
  return data === true;
}
