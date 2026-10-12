import { z } from 'zod';

import { ManilaDate, Uuid } from './primitives';

/** Weekly hours (table `business_hours`). Overnight hours are allowed (closesAt before opensAt). */
export const TimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM (24-hour).');
export type TimeOfDay = z.infer<typeof TimeOfDay>;

export const BusinessHours = z.object({
  tenantId: Uuid,
  /** 0 = Sunday … 6 = Saturday. */
  weekday: z.int().min(0).max(6),
  opensAt: TimeOfDay,
  closesAt: TimeOfDay,
});
export type BusinessHours = z.infer<typeof BusinessHours>;

/** Holidays and days off (table `closures`). */
export const Closure = z.object({
  tenantId: Uuid,
  closedOn: ManilaDate,
  note: z.string().nullable(),
});
export type Closure = z.infer<typeof Closure>;

/** One day's hours as Settings saves them (the whole week is replaced at once). */
export const DayHours = BusinessHours.pick({ weekday: true, opensAt: true, closesAt: true }).refine(
  (day) => day.opensAt !== day.closesAt,
  { message: 'Opening and closing times must differ.', path: ['closesAt'] },
);
export type DayHours = z.infer<typeof DayHours>;
