import { manilaDate } from '@smartapp/core';

import { useNow } from './orders/useNow';

/** The time and today's Manila date, renewed every 30 seconds, so Home and Reports roll over at midnight. */
export function useToday(): { now: Date; date: string } {
  const now = useNow();
  return { now, date: manilaDate(now) };
}
