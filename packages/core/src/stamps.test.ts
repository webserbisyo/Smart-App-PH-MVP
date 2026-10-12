import { describe, expect, it } from 'vitest';

import { stampProgress } from './stamps';

const rule = { isActive: true, stampsNeeded: 8 };

describe('stampProgress', () => {
  it('counts toward the next reward', () => {
    expect(stampProgress(0, rule)).toEqual({ filled: 0, stampsNeeded: 8, left: 8, rewardReady: false });
    expect(stampProgress(1, rule)).toEqual({ filled: 1, stampsNeeded: 8, left: 7, rewardReady: false });
    expect(stampProgress(7, rule)).toEqual({ filled: 7, stampsNeeded: 8, left: 1, rewardReady: false });
  });

  it('is ready at the goal and stays full past it', () => {
    expect(stampProgress(8, rule)).toEqual({ filled: 8, stampsNeeded: 8, left: 0, rewardReady: true });
    expect(stampProgress(11, rule)).toEqual({ filled: 8, stampsNeeded: 8, left: 0, rewardReady: true });
  });

  it('is null without an active stamp card, and never below zero', () => {
    expect(stampProgress(3, null)).toBeNull();
    expect(stampProgress(3, { ...rule, isActive: false })).toBeNull();
    expect(stampProgress(-2, rule)?.filled).toBe(0);
  });
});
