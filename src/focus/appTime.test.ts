import { describe, expect, it } from 'vitest';
import {
  addAppSeconds,
  appTotals,
  dropSpace,
  sanitizeAppTime,
  secondsOnApp,
  type AppTime,
} from './appTime';

const CODE = 'com.microsoft.VSCode';
const PS = 'com.adobe.Photoshop';

describe('addAppSeconds', () => {
  it('accumulates per space, day and app', () => {
    let time: AppTime = {};
    time = addAppSeconds(time, 's1', CODE, 60, '2026-08-17');
    time = addAppSeconds(time, 's1', CODE, 30, '2026-08-17');
    time = addAppSeconds(time, 's1', PS, 10, '2026-08-17');
    time = addAppSeconds(time, 's1', CODE, 5, '2026-08-18');
    time = addAppSeconds(time, 's2', CODE, 7, '2026-08-17');

    expect(secondsOnApp(time, 's1', '2026-08-17', CODE)).toBe(90);
    expect(secondsOnApp(time, 's1', '2026-08-17', PS)).toBe(10);
    expect(secondsOnApp(time, 's1', '2026-08-18', CODE)).toBe(5);
    expect(secondsOnApp(time, 's2', '2026-08-17', CODE)).toBe(7);
  });

  it('ignores empty keys and non-positive seconds', () => {
    const time: AppTime = {};
    expect(addAppSeconds(time, 's1', CODE, 0)).toBe(time);
    expect(addAppSeconds(time, 's1', CODE, -5)).toBe(time);
    expect(addAppSeconds(time, 's1', '', 10)).toBe(time);
    expect(addAppSeconds(time, '', CODE, 10)).toBe(time);
  });

  it('does not mutate the input', () => {
    const time = addAppSeconds({}, 's1', CODE, 60, '2026-08-17');
    const next = addAppSeconds(time, 's1', CODE, 60, '2026-08-17');
    expect(secondsOnApp(time, 's1', '2026-08-17', CODE)).toBe(60);
    expect(secondsOnApp(next, 's1', '2026-08-17', CODE)).toBe(120);
  });
});

describe('secondsOnApp', () => {
  it('is zero for anything unrecorded', () => {
    expect(secondsOnApp({}, 's1', '2026-08-17', CODE)).toBe(0);
  });
});

describe('appTotals', () => {
  it('sums a date range and sorts longest first', () => {
    let time: AppTime = {};
    time = addAppSeconds(time, 's1', CODE, 60, '2026-08-16');
    time = addAppSeconds(time, 's1', CODE, 60, '2026-08-17');
    time = addAppSeconds(time, 's1', PS, 200, '2026-08-17');

    expect(appTotals(time, 's1', ['2026-08-16', '2026-08-17'])).toEqual([
      { appKey: PS, seconds: 200 },
      { appKey: CODE, seconds: 120 },
    ]);
  });

  it('only counts the dates asked for', () => {
    const time = addAppSeconds({}, 's1', CODE, 60, '2026-08-16');
    expect(appTotals(time, 's1', ['2026-08-17'])).toEqual([]);
  });

  it('is empty for an unknown space', () => {
    expect(appTotals({}, 'nope', ['2026-08-17'])).toEqual([]);
  });
});

describe('dropSpace', () => {
  it('removes one space and leaves the rest', () => {
    let time: AppTime = {};
    time = addAppSeconds(time, 's1', CODE, 60, '2026-08-17');
    time = addAppSeconds(time, 's2', CODE, 60, '2026-08-17');

    const next = dropSpace(time, 's1');
    expect(next.s1).toBeUndefined();
    expect(secondsOnApp(next, 's2', '2026-08-17', CODE)).toBe(60);
  });

  it('returns the same object when there is nothing to drop', () => {
    const time: AppTime = {};
    expect(dropSpace(time, 's1')).toBe(time);
  });
});

describe('sanitizeAppTime', () => {
  it('drops app entries that cannot be a day of time', () => {
    const time: AppTime = {
      s1: { '2026-08-17': { [CODE]: 1.3e29, [PS]: 900 } },
    };
    expect(sanitizeAppTime(time)).toEqual({ s1: { '2026-08-17': { [PS]: 900 } } });
  });
});
