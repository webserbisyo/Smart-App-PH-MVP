import { useEffect, useState } from 'react';

/** The time, renewed every 30 seconds so ages ("4 min") and Late stay current. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30_000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  return now;
}
