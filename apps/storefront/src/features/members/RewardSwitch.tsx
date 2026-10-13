'use client';

import { useId } from 'react';

import { errorWords, formatPeso, stampLine, WORDS } from '@smartapp/core';
import { Button } from '@smartapp/ui/components/button';
import { Field, FieldDescription, FieldLabel } from '@smartapp/ui/components/field';
import { Switch } from '@smartapp/ui/components/switch';
import { IconGift } from '@smartapp/ui/icons';

import { useShop } from '../shell/ShopProvider';
import { useMember } from './use-member';
import { useReward } from './use-reward';

const words = WORDS.storefront.stamps;
const BOX = 'flex flex-col gap-2 rounded-xl border border-member/20 bg-member-soft p-3 text-member-soft-foreground';

/**
 * The stamp line in the cart and at checkout (P4.6). Members: "2 more orders to ₱100 off your order", or the
 * "Use ₱100 off" switch when the reward is ready. Guests (cart only): Join. Nothing when the stamp card is off.
 */
export function RewardSwitch({ showJoin = false }: { showJoin?: boolean }) {
  const { openJoin } = useShop();
  const { signedIn, account, progress } = useMember();
  const reward = useReward();
  const id = useId();
  const { rule } = reward;
  if (rule === null || signedIn === undefined || (signedIn && account === undefined)) return null;

  if (!account) {
    if (!showJoin) return null;
    return (
      <Button
        variant="outline"
        className="justify-start border-member/30 text-member-text"
        onClick={() => {
          openJoin(null);
        }}
      >
        <IconGift aria-hidden="true" />
        {words.join}
      </Button>
    );
  }
  if (progress === null) return null;

  if (!reward.ready) {
    return (
      <p className={`${BOX} flex-row items-center text-sm font-medium`}>
        <IconGift aria-hidden="true" className="size-5 shrink-0" />
        {stampLine(progress, rule.rewardLabel)}
      </p>
    );
  }

  return (
    <div className={BOX}>
      <Field orientation="horizontal" className="justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <FieldLabel htmlFor={id} className="font-semibold">
            {words.use(formatPeso(rule.rewardAmount))}
          </FieldLabel>
          <FieldDescription className="text-member-soft-foreground/80">{reward.on ? words.useHint : stampLine(progress, rule.rewardLabel)}</FieldDescription>
        </div>
        <Switch
          id={id}
          checked={reward.on}
          onCheckedChange={(checked) => {
            reward.setOn(checked);
          }}
          className="data-checked:bg-member"
        />
      </Field>
      {reward.rejected && (
        <p role="alert" className="text-sm font-medium text-destructive-text">
          {errorWords('reward_unavailable')}
        </p>
      )}
    </div>
  );
}
