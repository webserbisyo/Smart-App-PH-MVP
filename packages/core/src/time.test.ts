import { describe, expect, it } from 'vitest';

import {
  addDays,
  ageLabel,
  formatManilaDateTime,
  formatManilaTime,
  formatShortDate,
  formatTimeOfDay,
  manilaDate,
  manilaInstant,
  manilaParts,
  openState,
  minutesSince,
  minutesToTime,
  ticketNo,
  timeToMinutes,
  weekdayOf,
} from './time';
import { OPEN_CASES } from './test/open-cases';

describe('Manila business time', () => {
  it('uses Manila, not UTC, for the business date', () => {
    // 17:30 UTC on Oct 4 is 01:30 on Oct 5 in Manila.
    expect(manilaDate('2026-10-04T17:30:00Z')).toBe('2026-10-05');
    expect(manilaParts('2026-10-04T17:30:00Z')).toEqual({ date: '2026-10-05', weekday: 1, minutes: 90 });
  });

  it('adds days across months and years', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('knows weekdays and local instants', () => {
    expect(weekdayOf('2026-10-11')).toBe(0);
    expect(manilaInstant('2026-10-11', '15:30:00')).toBe('2026-10-11T15:30:00+08:00');
  });

  it('converts times of day', () => {
    expect(timeToMinutes('07:30:00')).toBe(450);
    expect(minutesToTime(450)).toBe('07:30');
    expect(minutesToTime(1440 + 30)).toBe('00:30');
    expect(formatTimeOfDay('00:00')).toBe('12:00 AM');
    expect(formatTimeOfDay('15:30:00')).toBe('3:30 PM');
  });

  it('formats instants in Manila', () => {
    expect(formatManilaTime('2026-10-11T07:30:00Z')).toBe('3:30 PM');
    expect(formatManilaDateTime('2026-10-11T07:30:00Z')).toBe('Oct 11, 2026, 3:30 PM');
    expect(formatShortDate('2026-10-11')).toBe('Sun, Oct 11');
  });
});

describe('ages', () => {
  const now = new Date('2026-10-11T08:00:00Z');

  it('counts whole minutes, never negative', () => {
    expect(minutesSince('2026-10-11T07:55:30Z', now)).toBe(4);
    expect(minutesSince('2026-10-11T09:00:00Z', now)).toBe(0);
  });

  it.each([
    [0, 'Just now'],
    [4, '4 min'],
    [59, '59 min'],
    [60, '1 hr'],
    [65, '1 hr 5 min'],
    [150, '2 hr 30 min'],
  ])('labels %i minutes as %s', (minutes, label) => {
    expect(ageLabel(minutes)).toBe(label);
  });

  it('pads the order number', () => {
    expect(ticketNo(42)).toBe('#042');
    expect(ticketNo(1234)).toBe('#1234');
  });
});

describe('openState', () => {
  it.each(OPEN_CASES)('$name', ({ hours, closures, now, expected }) => {
    expect(openState(hours, closures.map((closedOn) => ({ closedOn })), new Date(now))).toEqual(expected);
  });

  it('accepts database times with seconds', () => {
    const state = openState([{ weekday: 1, opensAt: '08:00:00', closesAt: '20:00:00' }], [], new Date('2026-10-12T09:00:00+08:00'));
    expect(state).toEqual({ isOpen: true, closesAt: '2026-10-12T20:00:00+08:00', nextOpensAt: null });
  });
});
