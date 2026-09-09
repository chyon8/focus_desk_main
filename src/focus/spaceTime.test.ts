import { describe, it, expect } from 'vitest';
import {
  addSpaceSeconds,
  dropSpace,
  isYesterday,
  lastVisit,
  type SpaceTime,
  MAX_TICK_MS,
  recentDateKeys,
  sanitizeTime,
  secondsOn,
  totalOver,
  totalsBySpace,
  usableDelta,
} from './spaceTime';

describe('space time', () => {
  it('accumulates seconds per space per day', () => {
    let time = addSpaceSeconds({}, 'a', 30, '2026-08-17');
    time = addSpaceSeconds(time, 'a', 12, '2026-08-17');
    time = addSpaceSeconds(time, 'b', 5, '2026-08-17');
    expect(secondsOn(time, 'a', '2026-08-17')).toBe(42);
    expect(secondsOn(time, 'b', '2026-08-17')).toBe(5);
  });

  it('keeps a session that crosses midnight on both days', () => {
    let time = addSpaceSeconds({}, 'a', 20, '2026-08-17');
    time = addSpaceSeconds(time, 'a', 10, '2026-08-18');
    expect(secondsOn(time, 'a', '2026-08-17')).toBe(20);
    expect(secondsOn(time, 'a', '2026-08-18')).toBe(10);
  });

  it('ignores empty writes', () => {
    expect(addSpaceSeconds({}, 'a', 0, '2026-08-17')).toEqual({});
    expect(addSpaceSeconds({}, 'a', -9, '2026-08-17')).toEqual({});
    expect(addSpaceSeconds({}, '', 9, '2026-08-17')).toEqual({});
  });

  it('banks at most one tick, so sleeping does not count as desk time', () => {
    expect(usableDelta(1_000, 0)).toBe(1_000);
    // Woke up three hours later.
    expect(usableDelta(3 * 3600_000, 0)).toBe(MAX_TICK_MS);
  });

  it('banks nothing when the clock moves backwards or stands still', () => {
    expect(usableDelta(500, 1_000)).toBe(0);
    expect(usableDelta(1_000, 1_000)).toBe(0);
  });

  it('ranks spaces over a range and totals them', () => {
    let time = addSpaceSeconds({}, 'a', 60, '2026-08-16');
    time = addSpaceSeconds(time, 'a', 30, '2026-08-17');
    time = addSpaceSeconds(time, 'b', 50, '2026-08-17');
    const dates = ['2026-08-16', '2026-08-17'];
    expect(totalsBySpace(time, dates)).toEqual([
      { spaceId: 'a', seconds: 90 },
      { spaceId: 'b', seconds: 50 },
    ]);
    expect(totalOver(time, dates)).toBe(140);
    expect(totalOver(time, ['2026-08-17'])).toBe(80);
  });

  it('forgets a deleted space', () => {
    const time = addSpaceSeconds({}, 'a', 60, '2026-08-17');
    expect(dropSpace(time, 'a')).toEqual({});
    expect(dropSpace(time, 'missing')).toBe(time);
  });

  it('lists the recent days oldest first, ending today', () => {
    const keys = recentDateKeys(3, new Date(2026, 7, 17, 12, 0));
    expect(keys).toEqual(['2026-08-15', '2026-08-16', '2026-08-17']);
  });

  it('drops days that hold more seconds than a day has', () => {
    const time = {
      a: { '2026-08-16': 3_600, '2026-08-17': 1.3e29 },
      b: { '2026-08-17': Number.POSITIVE_INFINITY },
    };
    expect(sanitizeTime(time)).toEqual({ a: { '2026-08-16': 3_600 }, b: {} });
  });
});

describe('lastVisit', () => {
  const now = new Date('2026-09-09T10:00:00');

  it('picks the last day used before today, and the longest stay in it', () => {
    const time: SpaceTime = {
      research: { '2026-09-07': 4000, '2026-09-08': 600 },
      writing: { '2026-09-08': 9240 },
      today: { '2026-09-09': 99999 },
    };
    expect(lastVisit(time, now)).toEqual({ spaceId: 'writing', date: '2026-09-08', seconds: 9240 });
  });

  it('says nothing about today, or about a space passed through', () => {
    expect(lastVisit({ a: { '2026-09-09': 5000 } }, now)).toBeNull();
    expect(lastVisit({ a: { '2026-09-08': 30 } }, now)).toBeNull();
    expect(lastVisit({}, now)).toBeNull();
  });

  it('reaches back past a weekend rather than only knowing yesterday', () => {
    const visit = lastVisit({ a: { '2026-09-04': 3000 } }, now);
    expect(visit?.date).toBe('2026-09-04');
    expect(isYesterday(visit!.date, now)).toBe(false);
    expect(isYesterday('2026-09-08', now)).toBe(true);
  });
});
