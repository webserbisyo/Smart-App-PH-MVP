import type { LoyaltyEntry } from '@smartapp/core';

// "Reward ready" confetti once per reward, remembered on this device (`smartapp.reward.<slug>`). Each card is named
// by the newest reward used before it, so a used reward starts a new card that celebrates again.

export function celebratedKey(slug: string): string {
  return `smartapp.reward.${slug}`;
}

/**
 * The card the member is on: the time of the newest reward used, or `first`. A reward given back (its order was
 * cancelled) does not count, so the returned reward is the same card and does not celebrate twice.
 */
export function rewardCycle(history: readonly Pick<LoyaltyEntry, 'reason' | 'createdAt' | 'orderId'>[]): string {
  const returned = new Set(history.flatMap((entry) => (entry.reason === 'reversed' && entry.orderId !== null ? [entry.orderId] : [])));
  const used = history.filter((entry) => entry.reason === 'redeemed' && (entry.orderId === null || !returned.has(entry.orderId))).map((entry) => entry.createdAt);
  return used.toSorted().at(-1) ?? 'first';
}

export function shouldCelebrate(ready: boolean, cycle: string, celebrated: string | null): boolean {
  return ready && celebrated !== cycle;
}

export function readCelebrated(slug: string): string | null {
  try {
    return window.localStorage.getItem(celebratedKey(slug));
  } catch {
    return null;
  }
}

export function markCelebrated(slug: string, cycle: string): void {
  try {
    window.localStorage.setItem(celebratedKey(slug), cycle);
  } catch {
    // Blocked storage: the confetti may show again next time, nothing else.
  }
}
