import type { OpenState, WeekdayHours } from '../time';

// Open or closed cases shared by the Vitest test of `openState` (packages/core) and, from P5.2, the pgTAP test of
// `private.is_open_now` (the database). Times are Manila (+08:00). 2026-10-12 is a Monday.

export interface OpenCase {
  name: string;
  hours: WeekdayHours[];
  closures: string[];
  now: string;
  expected: OpenState;
}

const everyDay = (opensAt: string, closesAt: string): WeekdayHours[] =>
  [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt, closesAt }));

export const OPEN_CASES: OpenCase[] = [
  {
    name: 'inside normal hours',
    hours: everyDay('08:00', '20:00'),
    closures: [],
    now: '2026-10-12T10:00:00+08:00',
    expected: { isOpen: true, closesAt: '2026-10-12T20:00:00+08:00', nextOpensAt: null },
  },
  {
    name: 'before opening',
    hours: everyDay('08:00', '20:00'),
    closures: [],
    now: '2026-10-12T07:59:00+08:00',
    expected: { isOpen: false, closesAt: null, nextOpensAt: '2026-10-12T08:00:00+08:00' },
  },
  {
    name: 'closing time itself is closed',
    hours: everyDay('08:00', '20:00'),
    closures: [],
    now: '2026-10-12T20:00:00+08:00',
    expected: { isOpen: false, closesAt: null, nextOpensAt: '2026-10-13T08:00:00+08:00' },
  },
  {
    name: 'overnight, before midnight',
    hours: everyDay('18:00', '02:00'),
    closures: [],
    now: '2026-10-12T23:30:00+08:00',
    expected: { isOpen: true, closesAt: '2026-10-13T02:00:00+08:00', nextOpensAt: null },
  },
  {
    name: 'overnight, after midnight (yesterday\'s hours)',
    hours: [{ weekday: 1, opensAt: '18:00', closesAt: '02:00' }],
    closures: [],
    now: '2026-10-13T01:00:00+08:00',
    expected: { isOpen: true, closesAt: '2026-10-13T02:00:00+08:00', nextOpensAt: null },
  },
  {
    name: 'overnight, after closing',
    hours: [{ weekday: 1, opensAt: '18:00', closesAt: '02:00' }],
    closures: [],
    now: '2026-10-13T03:00:00+08:00',
    expected: { isOpen: false, closesAt: null, nextOpensAt: '2026-10-19T18:00:00+08:00' },
  },
  {
    name: 'closure today wins over hours',
    hours: everyDay('08:00', '20:00'),
    closures: ['2026-10-12'],
    now: '2026-10-12T10:00:00+08:00',
    expected: { isOpen: false, closesAt: null, nextOpensAt: '2026-10-13T08:00:00+08:00' },
  },
  {
    name: 'closure today also ends yesterday\'s overnight hours',
    hours: everyDay('18:00', '02:00'),
    closures: ['2026-10-13'],
    now: '2026-10-13T01:00:00+08:00',
    expected: { isOpen: false, closesAt: null, nextOpensAt: '2026-10-14T18:00:00+08:00' },
  },
  {
    name: 'no hours means closed',
    hours: [],
    closures: [],
    now: '2026-10-12T10:00:00+08:00',
    expected: { isOpen: false, closesAt: null, nextOpensAt: null },
  },
  {
    name: 'Sunday to Monday: closed on Sunday, opens Monday',
    hours: [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, opensAt: '09:00', closesAt: '17:00' })),
    closures: [],
    now: '2026-10-11T12:00:00+08:00',
    expected: { isOpen: false, closesAt: null, nextOpensAt: '2026-10-12T09:00:00+08:00' },
  },
  {
    name: 'Saturday overnight runs into Sunday',
    hours: [{ weekday: 6, opensAt: '20:00', closesAt: '03:00' }],
    closures: [],
    now: '2026-10-11T02:30:00+08:00',
    expected: { isOpen: true, closesAt: '2026-10-11T03:00:00+08:00', nextOpensAt: null },
  },
  {
    name: 'device in another time zone still uses Manila time',
    hours: everyDay('08:00', '20:00'),
    closures: [],
    now: '2026-10-12T01:00:00Z',
    expected: { isOpen: true, closesAt: '2026-10-12T20:00:00+08:00', nextOpensAt: null },
  },
];
