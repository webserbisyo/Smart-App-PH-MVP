'use client';

import { useEffect, useState } from 'react';

import { stampProgress, WORDS } from '@smartapp/core';
import type { MemberAccount, StampRule } from '@smartapp/core';
import { StampCard } from '@smartapp/ui/patterns/StampCard';

import { markCelebrated, readCelebrated, rewardCycle, shouldCelebrate } from './celebrate';

/**
 * The member's stamp card. Confetti fires once when a reward is ready, remembered on this device per card, so
 * reopening the page never celebrates the same reward twice. `celebrate` off where the card is shown twice.
 */
export function MemberCard({ slug, account, rule, celebrate = true }: { slug: string; account: MemberAccount; rule: StampRule; celebrate?: boolean }) {
  const progress = stampProgress(account.stamps, rule);
  const ready = progress?.rewardReady ?? false;
  const cycle = rewardCycle(account.history);
  const [fire] = useState(() => celebrate && shouldCelebrate(ready, cycle, readCelebrated(slug)));

  useEffect(() => {
    if (fire) markCelebrated(slug, cycle);
  }, [fire, slug, cycle]);

  if (progress === null) return null;
  return <StampCard stamps={progress.filled} goal={progress.stampsNeeded} reward={rule.rewardLabel} words={WORDS.shared.stamps} celebrate={fire} />;
}
