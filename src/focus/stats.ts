export interface DayStats {
  date: string; // YYYY-MM-DD, local
  focusSeconds: number;
  tasksCompleted: number;
}

export type FocusStats = Record<string, DayStats>;

/** Local calendar day, not UTC — a session at 23:00 belongs to that day. */
export function todayKey(now = new Date()) {
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function emptyDay(date: string): DayStats {
  return { date, focusSeconds: 0, tasksCompleted: 0 };
}

export function addFocusTime(stats: FocusStats, seconds: number, date = todayKey()): FocusStats {
  if (seconds <= 0) return stats;
  const day = stats[date] ?? emptyDay(date);
  return { ...stats, [date]: { ...day, focusSeconds: day.focusSeconds + seconds } };
}

export function addCompletedTask(stats: FocusStats, date = todayKey()): FocusStats {
  const day = stats[date] ?? emptyDay(date);
  return { ...stats, [date]: { ...day, tasksCompleted: day.tasksCompleted + 1 } };
}

/** The last `days` calendar days ending today, oldest first, gaps filled with zeros. */
export function recentDays(stats: FocusStats, days: number, now = new Date()): DayStats[] {
  const out: DayStats[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = todayKey(date);
    out.push(stats[key] ?? emptyDay(key));
  }
  return out;
}

export function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

export function formatClock(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(secs)}` : `${minutes}:${pad(secs)}`;
}
