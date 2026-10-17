'use client';

import { rewardDiscount } from '@smartapp/core';
import type { RewardRule, StampRule } from '@smartapp/core';

import { useShop } from '../shell/ShopProvider';
import { useMember } from './use-member';

export interface RewardChoice {
  /** The member's reward is ready, so the switch shows. */
  ready: boolean;
  /** Ready and switched on: quote_order and place_order get `useReward: true`. */
  on: boolean;
  /** The database said the reward is not ready; the switch went off. */
  rejected: boolean;
  rule: StampRule | RewardRule | null;
  setOn: (on: boolean) => void;
  /** The cart's estimate of what the reward takes off (checkout shows the database's quote). */
  discount: (subtotal: number) => number;
}

/** The "Use ₱100 off" switch, shared by the cart and checkout. */
export function useReward(): RewardChoice {
  const { reward, setRewardOn } = useShop();
  const { rule, progress } = useMember();
  const canUseInOrder = rule !== null && ('rewardKind' in rule ? rule.rewardKind !== 'custom' : true);
  const ready = canUseInOrder && progress?.rewardReady === true;
  const on = ready && reward.on;
  return {
    ready,
    on,
    rejected: reward.rejected,
    rule,
    setOn: setRewardOn,
    discount: (subtotal) => (on ? rewardDiscount(subtotal, rule) : 0),
  };
}
