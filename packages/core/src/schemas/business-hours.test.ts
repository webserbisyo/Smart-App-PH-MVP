import { describe, expect, it } from 'vitest';

import { businessHours, closure } from '../test/samples';

import { BusinessHours, Closure } from './business-hours';

describe('business-hours', () => {
  it('a valid BusinessHours parses', () => {
    expect(BusinessHours.parse(businessHours)).toEqual(businessHours);
  });
  it('a valid Closure parses', () => {
    expect(Closure.parse(closure)).toEqual(closure);
  });
  it('rejects a weekday outside 0 to 6 and a bad time', () => {
    expect(BusinessHours.safeParse({ ...businessHours, weekday: 7 }).success).toBe(false);
    expect(BusinessHours.safeParse({ ...businessHours, opensAt: '24:00' }).success).toBe(false);
  });
  it('allows overnight hours', () => {
    expect(BusinessHours.safeParse({ ...businessHours, opensAt: '18:00', closesAt: '02:00' }).success).toBe(true);
  });
});
