import { describe, it, expect } from 'vitest';
import { addCompletedTask, addFocusTime, formatDuration, recentDays, todayKey } from './stats';

describe('focus stats', () => {
  it('accumulates focus time on the same day', () => {
    let stats = addFocusTime({}, 60, '2026-08-16');
    stats = addFocusTime(stats, 90, '2026-08-16');
    expect(stats['2026-08-16'].focusSeconds).toBe(150);
  });

  it('ignores non-positive durations', () => {
    expect(addFocusTime({}, 0, '2026-08-16')).toEqual({});
    expect(addFocusTime({}, -5, '2026-08-16')).toEqual({});
  });

  it('counts completed tasks without disturbing focus time', () => {
    const stats = addCompletedTask(addFocusTime({}, 30, '2026-08-16'), '2026-08-16');
    expect(stats['2026-08-16']).toMatchObject({ focusSeconds: 30, tasksCompleted: 1 });
  });

  it('uses the local calendar day, not UTC', () => {
    // 23:30 local must stay on its own local date.
    const late = new Date(2026, 7, 16, 23, 30);
    expect(todayKey(late)).toBe('2026-08-16');
  });

  it('fills gaps in the recent-day window and ends today', () => {
    const now = new Date(2026, 7, 16);
    const stats = addFocusTime({}, 120, '2026-08-14');
    const week = recentDays(stats, 7, now);

    expect(week).toHaveLength(7);
    expect(week[week.length - 1].date).toBe('2026-08-16');
    expect(week[week.length - 1].focusSeconds).toBe(0);
    expect(week.find((d) => d.date === '2026-08-14')!.focusSeconds).toBe(120);
  });

  it('formats durations for humans', () => {
    expect(formatDuration(45)).toBe('45s');
    expect(formatDuration(600)).toBe('10m');
    expect(formatDuration(3900)).toBe('1h 5m');
  });
});
