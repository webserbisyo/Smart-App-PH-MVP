import { z } from 'zod';

import { Centavos, Uuid } from './primitives';

/** One add-on choice, such as "Extra shot" (table `options`). */
export const Option = z.object({
  id: Uuid,
  tenantId: Uuid,
  groupId: Uuid,
  name: z.string().min(1).max(60),
  priceDelta: Centavos,
  isSoldOut: z.boolean(),
});
export type Option = z.infer<typeof Option>;

/** A group of add-ons, such as sugar level or toppings (table `option_groups`). */
export const OptionGroup = z
  .object({
    id: Uuid,
    tenantId: Uuid,
    name: z.string().min(1).max(60),
    minSelect: z.int().nonnegative(),
    maxSelect: z.int().positive(),
    options: z.array(Option),
  })
  .refine((group) => group.maxSelect >= group.minSelect, {
    message: 'maxSelect must be at least minSelect.',
    path: ['maxSelect'],
  });
export type OptionGroup = z.infer<typeof OptionGroup>;

/** Which option groups an item uses (table `item_option_groups`). */
export const ItemOptionGroup = z.object({
  itemId: Uuid,
  groupId: Uuid,
});
export type ItemOptionGroup = z.infer<typeof ItemOptionGroup>;
