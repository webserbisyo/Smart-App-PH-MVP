import type { StampRule } from './schemas/stamp-rule';

/** Where a member stands on the shop's stamp card. */
export interface StampProgress {
  /** Stamps on the card toward the next reward (0 to stampsNeeded). */
  filled: number;
  stampsNeeded: number;
  /** Stamps still to collect; 0 once the reward is ready. */
  left: number;
  rewardReady: boolean;
}

/**
 * The stamp line and card (paper 6.7): stamps toward the next reward and whether the reward is ready. Null when the
 * shop's stamp card is off or missing. Extra stamps past the goal wait for the next card after the reward is used.
 */
export function stampProgress(balance: number, rule: Pick<StampRule, 'isActive' | 'stampsNeeded'> | null): StampProgress | null {
  if (rule === null || !rule.isActive) return null;
  const stamps = Math.max(0, Math.trunc(balance));
  const filled = Math.min(stamps, rule.stampsNeeded);
  return { filled, stampsNeeded: rule.stampsNeeded, left: rule.stampsNeeded - filled, rewardReady: stamps >= rule.stampsNeeded };
}
