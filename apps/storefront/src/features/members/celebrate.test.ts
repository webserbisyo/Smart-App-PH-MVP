import { describe, expect, it } from 'vitest';

import { rewardCycle, shouldCelebrate } from './celebrate';

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';
const C = '00000000-0000-4000-8000-00000000000c';

describe('reward confetti', () => {
  it('names the card by the newest reward used', () => {
    expect(rewardCycle([])).toBe('first');
    expect(rewardCycle([{ reason: 'welcome', createdAt: '2026-10-01T01:00:00Z', orderId: null }])).toBe('first');
    expect(
      rewardCycle([
        { reason: 'redeemed', createdAt: '2026-10-05T01:00:00Z', orderId: A },
        { reason: 'earned', createdAt: '2026-10-06T01:00:00Z', orderId: B },
        { reason: 'redeemed', createdAt: '2026-10-02T01:00:00Z', orderId: C },
      ]),
    ).toBe('2026-10-05T01:00:00Z');
  });

  it('keeps the same card when a used reward is given back', () => {
    expect(
      rewardCycle([
        { reason: 'reversed', createdAt: '2026-10-05T02:00:00Z', orderId: A },
        { reason: 'redeemed', createdAt: '2026-10-05T01:00:00Z', orderId: A },
      ]),
    ).toBe('first');
  });

  it('celebrates a ready reward once per card', () => {
    expect(shouldCelebrate(true, 'first', null)).toBe(true);
    expect(shouldCelebrate(true, 'first', 'first')).toBe(false);
    expect(shouldCelebrate(true, '2026-10-05T01:00:00Z', 'first')).toBe(true);
    expect(shouldCelebrate(false, 'first', null)).toBe(false);
  });
});
