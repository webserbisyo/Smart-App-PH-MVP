import { z } from 'zod';

import { RewardKind } from './enums';
import { Centavos, Uuid } from './primitives';

/**
 * The shop's loyalty and reward rule (table `loyalty_rules`).
 * Supports three reward kinds: discount (peso deduction), free_item (menu variant), or custom (off-menu prize).
 */
export const RewardRule = z.object({
  tenantId: Uuid,
  isActive: z.boolean(),
  minOrderTotal: Centavos,
  stampsNeeded: z.int().min(1).max(50),
  rewardKind: RewardKind.default('discount'),
  rewardLabel: z.string().min(1).max(80),
  rewardAmount: Centavos,
  rewardItemId: Uuid.nullable().optional(),
  rewardVariantId: Uuid.nullable().optional(),
  rewardTitle: z.string().max(60).nullable().optional(),
  rewardDescription: z.string().max(200).nullable().optional(),
  rewardImagePath: z.string().nullable().optional(),
  freeItemName: z.string().nullable().optional(),
});
export type RewardRule = z.infer<typeof RewardRule>;
