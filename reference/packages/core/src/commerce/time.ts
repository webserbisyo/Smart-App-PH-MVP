// Business time is the Philippines (Asia/Manila, UTC+8, no daylight saving), whatever the device's zone.

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

/** The Manila calendar date, weekday and time of an instant. */
export function manilaParts(instant: Date): ManilaParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    weekday: WEEKDAYS.indexOf(get('weekday')),
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/** `YYYY-MM-DD` in Manila. */
export function manilaDate(instant: Date): string {
  return manilaParts(instant).date;
}

/** `2026-10-04` + 1 → `2026-10-05` (calendar arithmetic, no time zone involved). */
export function addDays(date: string, days: number): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return utc.toISOString().slice(0, 10);
}

/** Weekday (0 = Sunday) of a calendar date. */
export function weekdayOf(date: string): number {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** The instant of a Manila local date + `HH:MM` (ISO with +08:00). */
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

// --- date presets (filters, reports) -----------------------------------------------------------

export const DATE_PRESET_KEYS = ['today', 'yesterday', 'last7', 'last30', 'month'] as const;
export type DatePresetKey = (typeof DATE_PRESET_KEYS)[number];

export interface DateRange {
  /** Inclusive `YYYY-MM-DD` (Manila business dates). */
  from: string;
  to: string;
}

/** Today · Yesterday · 7 days · 30 days (both incl. today) · This month, as Manila business dates. */
export function datePresets(now: Date): Record<DatePresetKey, DateRange> {
  const today = manilaDate(now);
  return {
    today: { from: today, to: today },
    yesterday: { from: addDays(today, -1), to: addDays(today, -1) },
    last7: { from: addDays(today, -6), to: today },
    last30: { from: addDays(today, -29), to: today },
    month: { from: `${today.slice(0, 8)}01`, to: today },
  };
}

// --- display helpers ----------------------------------------------------------------------------

/** Daily order number as shown everywhere: `#042`. */
export function ticketNo(orderNo: number): string {
  return `#${String(orderNo).padStart(3, '0')}`;
}

/** `+639171234567` → `0917 123 4567`. Anything else is returned as it is. */
export function formatPhoneDisplay(phone: string): string {
  const match = /^\+63(9\d{2})(\d{3})(\d{4})$/.exec(phone);
  return match ? `0${match[1] ?? ''} ${match[2] ?? ''} ${match[3] ?? ''}` : phone;
}

/** `+639171234567` → `tel:+639171234567`. */
export function telLink(phone: string): string {
  return `tel:${phone}`;
}

/** `h:mm AM/PM` in Manila. */
export function formatClock(instant: Date | string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, hour: 'numeric', minute: '2-digit' }).format(date);
}

/** `HH:MM[:SS]` (a business hour) → `7:00 AM`. */
export function formatTimeOfDay(time: string): string {
  const minutes = timeToMinutes(time);
  const hours = Math.floor(minutes / 60) % 24;
  const suffix = hours < 12 ? 'AM' : 'PM';
  const twelve = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(twelve)}:${String(minutes % 60).padStart(2, '0')} ${suffix}`;
}

/** `Oct 4, 2026, 12:21 PM` in Manila (exact time on hover / tap). */
export function formatDateTime(instant: Date | string): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant;
  return new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/** `Sun, Oct 4` for a `YYYY-MM-DD`. */
export function formatShortDate(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** `Oct 4` for a `YYYY-MM-DD` (chart axes). */
export function formatDayLabel(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** An hour of the day (0–23) → `12 AM`, `9 AM`, `3 PM`. */
export function formatHour(hour: number): string {
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(twelve)} ${hour % 24 < 12 ? 'AM' : 'PM'}`;
}

/** Seconds left → `1:45:00` / `4:05`. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rest = safe % 60;
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  return hours > 0 ? `${String(hours)}:${mm}:${String(rest).padStart(2, '0')}` : `${mm}:${String(rest).padStart(2, '0')}`;
}

export type RelativeUnit = 'now' | 'minutes' | 'hours' | 'days';

/** "just now", "5 min ago", "2 h ago", "3 d ago" as a unit + count; the app words it. */
export function relativeAge(fromIso: string, now: Date): { unit: RelativeUnit; count: number } {
  const minutes = Math.floor((now.getTime() - new Date(fromIso).getTime()) / 60_000);
  if (minutes < 1) return { unit: 'now', count: 0 };
  if (minutes < 60) return { unit: 'minutes', count: minutes };
  if (minutes < 1440) return { unit: 'hours', count: Math.floor(minutes / 60) };
  return { unit: 'days', count: Math.floor(minutes / 1440) };
}

/** An instant → the value of a `datetime-local` input in Manila (`2026-10-04T13:05`). */
export function toManilaInput(instant: string | Date): string {
  const parts = manilaParts(typeof instant === 'string' ? new Date(instant) : instant);
  return `${parts.date}T${minutesToTime(parts.minutes).slice(0, 5)}`;
}

/** A `datetime-local` value typed in Manila → an ISO instant, or `null` when empty or malformed. */
export function fromManilaInput(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value.trim());
  return match?.[1] && match[2] ? manilaInstant(match[1], match[2]) : null;
}
