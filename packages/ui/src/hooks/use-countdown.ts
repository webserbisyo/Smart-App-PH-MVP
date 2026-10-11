import { useEffect, useState } from 'react';

/** Seconds left until `until` (a Date.now() time), ticking each second; 0 when passed or null. */
export function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null) return;
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [until]);
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}
