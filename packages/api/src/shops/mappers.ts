import { Tenant } from '@smartapp/core';

import type { Database } from '../database.types';

export type TenantRow = Database['public']['Tables']['tenants']['Row'];

/** A `tenants` row → the core Tenant, parsed (snake_case → camelCase). */
export function tenantFromRow(row: TenantRow): Tenant {
  return Tenant.parse({
    id: row.id,
    slug: row.slug,
    name: row.name,
    businessType: row.business_type,
    status: row.status,
    plan: row.plan,
    paidUntil: row.paid_until,
    isDemo: row.is_demo,
    createdAt: row.created_at,
  });
}
