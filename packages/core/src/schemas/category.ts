import { z } from 'zod';

import { Uuid } from './primitives';

/**
 * A category's icon (decision UI-3): a Fluent 3D icon by key, an emoji typed on the phone, or an uploaded photo
 * (a `shop-media` path). The database stores it as `icon_kind` + `icon_value`.
 */
export const CategoryIcon = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fluent'), key: z.string().min(1).max(60) }),
  z.object({ kind: z.literal('emoji'), value: z.string().min(1).max(16) }),
  z.object({ kind: z.literal('image'), path: z.string().min(1) }),
]);
export type CategoryIcon = z.infer<typeof CategoryIcon>;

/** A catalog category (table `categories`). */
export const Category = z.object({
  id: Uuid,
  tenantId: Uuid,
  name: z.string().min(1).max(60),
  sort: z.int(),
  isHidden: z.boolean(),
  icon: CategoryIcon.nullable(),
});
export type Category = z.infer<typeof Category>;
