// Business time is the Philippines (Asia/Manila, UTC+8, no daylight saving), whatever the device's zone.
import { WORDS } from './words';

export const BUSINESS_TIME_ZONE = 'Asia/Manila';
/** Manila is always UTC+8 (no DST), so a local time converts with a fixed offset. */
export const MANILA_OFFSET = '+08:00';

export interface ManilaParts {
  /** `YYYY-MM-DD` */
  date: string;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** Minutes since local midnight. */
  minutes: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDate(instant: Date | string): Date {
  return typeof instant === 'string' ? new Date(instant) : instant;
}

/** The Manila calendar date, weekday and time of day of an instant. */
export function manilaParts(instant: Date | string): ManilaParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(toDate(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: WEEKDAYS.indexOf(get('weekday')),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** The business date (`YYYY-MM-DD`) in Manila: what "today" means for orders and reports. */
export function manilaDate(instant: Date | string): string {
  return manilaParts(instant).date;
}

/** `2026-10-04` + 1 → `2026-10-05` (calendar arithmetic, no time zone involved). */
export function addDays(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Weekday (0 = Sunday) of a calendar date. */
export function weekdayOf(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** The instant of a Manila local date and `HH:MM` (ISO with +08:00). */
export function manilaInstant(date: string, time: string): string {
  return `${date}T${time.slice(0, 5)}:00${MANILA_OFFSET}`;
}

/** `07:30:00` → minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Minutes since midnight → `HH:MM`. */
export function minutesToTime(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

/** `3:30 PM` in Manila. */
export function formatManilaTime(instant: Date | string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, hour: 'numeric', minute: '2-digit' }).format(
    toDate(instant),
  );
}

/** `Oct 4, 2026, 12:21 PM` in Manila. */
export function formatManilaDateTime(instant: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(toDate(instant));
}

/** `Sun, Oct 4` for a `YYYY-MM-DD`. */
export function formatShortDate(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** A business hour (`HH:MM[:SS]`) → `7:00 AM`. */
export function formatTimeOfDay(time: string): string {
  const minutes = timeToMinutes(time);
  const hours = Math.floor(minutes / 60) % 24;
  const suffix = hours < 12 ? 'AM' : 'PM';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(twelve)}:${String(minutes % 60).padStart(2, '0')} ${suffix}`;
}

/** Whole minutes from `from` to `now`, never negative. */
export function minutesSince(from: Date | string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - toDate(from).getTime()) / 60_000));
}

/** How long something has waited: `Just now`, `4 min`, `1 hr`, `1 hr 5 min`. */
export function ageLabel(minutes: number): string {
  const words = WORDS.shared.age;
  const whole = Math.max(0, Math.floor(minutes));
  if (whole < 1) return words.justNow;
  if (whole < 60) return words.minutes(whole);
  return words.hours(Math.floor(whole / 60), whole % 60);
}

/** The daily order number as shown everywhere: `#042`. */
export function ticketNo(orderNo: number): string {
  return `#${String(orderNo).padStart(3, '0')}`;
}
