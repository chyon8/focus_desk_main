import { todayKey } from './stats';

/**
 * Time spent inside each space, split by local calendar day:
 * `time[spaceId]['2026-08-17'] = seconds`.
 *
 * Days are keyed at write time, so a session running through midnight lands in
 * both days by itself — no rollover pass, nothing to miss if the app is closed.
 */
export type SpaceTime = Record<string, Record<string, number>>;

/**
 * The most one tick may bank. The tick runs every second, so a larger gap is not
 * time at the desk: the machine slept, the timer was throttled while the window
 * was busy, or the system clock moved.
 */
export const MAX_TICK_MS = 5_000;

/** Milliseconds worth counting between two ticks. A clock moved backwards banks nothing. */
export function usableDelta(now: number, previous: number) {
  const delta = now - previous;
  if (delta <= 0) return 0;
  return Math.min(delta, MAX_TICK_MS);
}

/** A calendar day cannot hold more than this, so anything past it is not time. */
export const MAX_DAY_SECONDS = 86_400;

/**
 * Drops entries that cannot be time. Loading used to add the stored copy to
 * whatever was already in memory, which doubled every total on each run that
 * loaded twice (StrictMode does), and the result is unrecoverable rather than
 * merely wrong — the real seconds cannot be read back out of it.
 */
export function sanitizeTime(time: SpaceTime): SpaceTime {
  const clean: SpaceTime = {};
  for (const [spaceId, days] of Object.entries(time ?? {})) {
    const kept: Record<string, number> = {};
    for (const [date, seconds] of Object.entries(days ?? {})) {
      if (Number.isFinite(seconds) && seconds >= 0 && seconds <= MAX_DAY_SECONDS) {
        kept[date] = seconds;
      }
    }
    clean[spaceId] = kept;
  }
  return clean;
}

export function addSpaceSeconds(
  time: SpaceTime,
  spaceId: string,
  seconds: number,
  date = todayKey()
): SpaceTime {
  if (!spaceId || seconds <= 0) return time;
  const days = time[spaceId] ?? {};
  return { ...time, [spaceId]: { ...days, [date]: (days[date] ?? 0) + seconds } };
}

export function dropSpace(time: SpaceTime, spaceId: string): SpaceTime {
  if (!(spaceId in time)) return time;
  const next = { ...time };
  delete next[spaceId];
  return next;
}

export function secondsOn(time: SpaceTime, spaceId: string, date: string) {
  return time[spaceId]?.[date] ?? 0;
}

export function secondsOver(time: SpaceTime, spaceId: string, dates: string[]) {
  return dates.reduce((sum, date) => sum + secondsOn(time, spaceId, date), 0);
}

/** Every space that logged time over these days, longest first. */
export function totalsBySpace(time: SpaceTime, dates: string[]) {
  return Object.keys(time)
    .map((spaceId) => ({ spaceId, seconds: secondsOver(time, spaceId, dates) }))
    .filter((entry) => entry.seconds > 0)
    .sort((a, b) => b.seconds - a.seconds);
}

/** All spaces added together, for one day or a range. */
export function totalOver(time: SpaceTime, dates: string[]) {
  return Object.keys(time).reduce((sum, spaceId) => sum + secondsOver(time, spaceId, dates), 0);
}

/** The last `days` calendar days ending today, oldest first. */
export function recentDateKeys(days: number, now = new Date()) {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    keys.push(todayKey(date));
  }
  return keys;
}

/** The space someone spent the most time in, on the last day before today they used the app. */
export interface LastVisit {
  spaceId: string;
  /** YYYY-MM-DD, local. */
  date: string;
  seconds: number;
}

/**
 * Under a minute in a space is a space that was passed through, not worked in,
 * and reading it back as "you spent 12s here" is worse than saying nothing.
 */
export const LAST_VISIT_MIN_SECONDS = 60;

/**
 * What the desk can say to somebody coming back: where they were last time and
 * for how long.
 *
 * The last day the app was used, not yesterday specifically — a Monday morning
 * would otherwise have nothing to say about Friday. Within that day it is the
 * one space they gave the most time to; several spaces in one day is normal and
 * listing them all is a report, not a greeting.
 */
export function lastVisit(time: SpaceTime, now = new Date()): LastVisit | null {
  const today = todayKey(now);
  let best: LastVisit | null = null;
  for (const [spaceId, days] of Object.entries(time ?? {})) {
    for (const [date, seconds] of Object.entries(days ?? {})) {
      if (date >= today || seconds < LAST_VISIT_MIN_SECONDS) continue;
      // A later day always wins; within one day, the longer stay does.
      if (!best || date > best.date || (date === best.date && seconds > best.seconds)) {
        best = { spaceId, date, seconds };
      }
    }
  }
  return best;
}

/** True when `date` is the calendar day before today, so the line can say "Yesterday". */
export function isYesterday(date: string, now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return todayKey(d) === date;
}
