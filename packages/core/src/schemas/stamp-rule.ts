import { z } from 'zod';

import { Centavos, Uuid } from './primitives';

/**
 * The shop's stamp card (table `loyalty_rules`): 1 stamp per completed, paid order of at least
 * minOrderTotal; stampsNeeded stamps earn the reward (a peso discount).
 */
export const StampRule = z.object({
  tenantId: Uuid,
  isActive: z.boolean(),
  minOrderTotal: Centavos,
  stampsNeeded: z.int().min(1).max(50),
  rewardLabel: z.string().min(1).max(80),
  rewardAmount: Centavos,
});
export type StampRule = z.infer<typeof StampRule>;
