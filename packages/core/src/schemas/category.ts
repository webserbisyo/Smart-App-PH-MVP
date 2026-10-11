import { z } from 'zod';

import { Uuid } from './primitives';

/** A catalog category (table `categories`). */
export const Category = z.object({
  id: Uuid,
  tenantId: Uuid,
  name: z.string().min(1).max(60),
  sort: z.int(),
  isHidden: z.boolean(),
});
export type Category = z.infer<typeof Category>;
