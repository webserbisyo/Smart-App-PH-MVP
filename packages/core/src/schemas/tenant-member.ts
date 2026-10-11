import { z } from 'zod';

import { MemberRole } from './enums';
import { Uuid } from './primitives';

/** A login's role in a shop (table `tenant_members`). One owner per shop at launch. */
export const TenantMember = z.object({
  tenantId: Uuid,
  userId: Uuid,
  role: MemberRole,
});
export type TenantMember = z.infer<typeof TenantMember>;
