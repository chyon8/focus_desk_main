import { useEffect, useState } from 'react';
import { todayKey } from './stats';

/**
 * Today's date key, kept current: the app is left open overnight, and a view
 * holding yesterday's key would quietly stop counting at midnight.
 */
export function useToday() {
  const [date, setDate] = useState(todayKey);

  useEffect(() => {
    const interval = setInterval(() => {
      setDate((current) => {
        const next = todayKey();
        return next === current ? current : next;
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return date;
}
