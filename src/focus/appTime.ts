import { MAX_DAY_SECONDS } from './spaceTime';
import { todayKey } from './stats';

/**
 * Time spent in each app, inside each space, split by local calendar day:
 * `time[spaceId]['2026-08-17']['com.microsoft.VSCode'] = seconds` (D-039).
 *
 * This is a breakdown of the space totals in `spaceTime.ts`, not a second
 * clock — the same seconds are banked in both, from the same tick. Whatever is
 * left over after subtracting the apps is Focus Desk's own share, so the app
 * never has to count time against itself.
 */
export type AppTime = Record<string, Record<string, Record<string, number>>>;

/** The same repair as `sanitizeTime`, for the per-app breakdown. */
export function sanitizeAppTime(time: AppTime): AppTime {
  const clean: AppTime = {};
  for (const [spaceId, days] of Object.entries(time ?? {})) {
    const keptDays: Record<string, Record<string, number>> = {};
    for (const [date, apps] of Object.entries(days ?? {})) {
      const kept: Record<string, number> = {};
      for (const [appKey, seconds] of Object.entries(apps ?? {})) {
        if (Number.isFinite(seconds) && seconds >= 0 && seconds <= MAX_DAY_SECONDS) {
          kept[appKey] = seconds;
        }
      }
      keptDays[date] = kept;
    }
    clean[spaceId] = keptDays;
  }
  return clean;
}

export function addAppSeconds(
  time: AppTime,
  spaceId: string,
  appKey: string,
  seconds: number,
  date = todayKey()
): AppTime {
  if (!spaceId || !appKey || seconds <= 0) return time;
  const days = time[spaceId] ?? {};
  const apps = days[date] ?? {};
  return {
    ...time,
    [spaceId]: { ...days, [date]: { ...apps, [appKey]: (apps[appKey] ?? 0) + seconds } },
  };
}

export function dropSpace(time: AppTime, spaceId: string): AppTime {
  if (!(spaceId in time)) return time;
  const next = { ...time };
  delete next[spaceId];
  return next;
}

export function secondsOnApp(time: AppTime, spaceId: string, date: string, appKey: string) {
  return time[spaceId]?.[date]?.[appKey] ?? 0;
}

/** Every app that logged time in a space over these days, longest first. */
export function appTotals(time: AppTime, spaceId: string, dates: string[]) {
  const totals: Record<string, number> = {};
  for (const date of dates) {
    for (const [appKey, seconds] of Object.entries(time[spaceId]?.[date] ?? {})) {
      totals[appKey] = (totals[appKey] ?? 0) + seconds;
    }
  }
  return Object.entries(totals)
    .map(([appKey, seconds]) => ({ appKey, seconds }))
    .filter((entry) => entry.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}
