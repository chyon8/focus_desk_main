import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Clock, X } from 'lucide-react';
import { appWidgets } from '../apps/spaceApps';
import { useAppTimeStore } from '../stores/appTimeStore';
import { useFocusStore } from '../stores/focusStore';
import { useSpaceStore } from '../stores/spaceStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { appTotals } from './appTime';
import { recentDateKeys, totalOver, totalsBySpace } from './spaceTime';
import { formatDuration } from './stats';
import { useToday } from './useToday';

const WEEK = 7;

/**
 * What the desk actually recorded: time spent in each space, counted only while
 * the app was in front of the user, split by calendar day.
 */
export const FocusInsights: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const today = useToday();
  const time = useSpaceTimeStore((s) => s.time);
  const appTime = useAppTimeStore((s) => s.time);
  const spaceNames = useSpaceStore((s) => s.spaces);
  const tasksToday = useFocusStore((s) => s.stats[today]?.tasksCompleted ?? 0);

  // An app removed from its space keeps its hours but loses its name, so fall
  // back to the tail of the bundle id rather than showing nothing.
  const appNames = React.useMemo(() => {
    const names: Record<string, string> = {};
    for (const space of Object.values(spaceNames)) {
      for (const { data } of appWidgets(space)) {
        if (data.appKey) names[data.appKey] = data.name;
      }
    }
    return names;
  }, [spaceNames]);

  const week = recentDateKeys(WEEK, new Date(`${today}T12:00:00`));
  const perDay = week.map((date) => ({ date, seconds: totalOver(time, [date]) }));
  const peak = Math.max(1, ...perDay.map((d) => d.seconds));
  const weekTotal = totalOver(time, week);
  const bySpace = totalsBySpace(time, week);
  const spaceMax = Math.max(1, ...bySpace.map((s) => s.seconds));

  return (
    <div
      className="scrim-overlay fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel w-[520px] max-w-[90vw] max-h-[85vh] overflow-y-auto p-6 rounded-3xl shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="t-soft text-sm font-bold uppercase tracking-widest">Focus Insights</h2>
          <button onClick={onClose} className="chrome-button p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <Stat icon={<Clock size={14} />} label="Today" value={formatDuration(totalOver(time, [today]))} />
          <Stat icon={<CalendarDays size={14} />} label="Last 7 days" value={formatDuration(weekTotal)} />
          <Stat icon={<CheckCircle2 size={14} />} label="Tasks today" value={String(tasksToday)} />
        </div>

        <div className="t-faint text-[10px] font-bold uppercase tracking-widest mb-3">This week</div>
        <div className="flex items-end justify-between gap-2 h-40 mb-8">
          {perDay.map((day) => {
            const isToday = day.date === today;
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="t-faint text-[9px] tabular-nums">
                  {day.seconds > 0 ? formatDuration(day.seconds) : ''}
                </span>
                <div
                  className="w-full rounded-t-md transition-colors"
                  style={{
                    height: `${Math.max(2, (day.seconds / peak) * 100)}%`,
                    background: isToday
                      ? 'var(--accent)'
                      : 'color-mix(in srgb, var(--ink) 18%, transparent)',
                  }}
                />
                <span className={`text-[10px] ${isToday ? 't-ink' : 't-faint'}`}>
                  {new Date(`${day.date}T00:00:00`).toLocaleDateString([], { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>

        <div className="t-faint text-[10px] font-bold uppercase tracking-widest mb-3">By space</div>
        {bySpace.length === 0 ? (
          <div className="t-faint text-xs">Nothing recorded yet this week.</div>
        ) : (
          <div className="space-y-2.5">
            {bySpace.map(({ spaceId, seconds }) => (
              <div key={spaceId}>
                <div className="flex items-baseline justify-between mb-1">
                  {/* A space deleted mid-week keeps its hours but loses its name. */}
                  <span className="t-ink text-xs truncate">
                    {spaceNames[spaceId]?.name ?? 'Deleted space'}
                  </span>
                  <span className="t-soft text-[11px] tabular-nums">{formatDuration(seconds)}</span>
                </div>
                <div
                  className="h-1.5 rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--ink) 10%, transparent)' }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(seconds / spaceMax) * 100}%`, background: 'var(--accent)' }}
                  />
                </div>
                <AppBreakdown
                  apps={appTotals(appTime, spaceId, week)}
                  names={appNames}
                  total={seconds}
                />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

/**
 * Which apps a space's hours went to. Whatever the apps do not account for is
 * Focus Desk's own share, so it never has to be counted (D-039).
 */
const AppBreakdown: React.FC<{
  apps: { appKey: string; seconds: number }[];
  names: Record<string, string>;
  total: number;
}> = ({ apps, names, total }) => {
  if (apps.length === 0) return null;

  const own = total - apps.reduce((sum, app) => sum + app.seconds, 0);
  const rows = apps.map((app) => ({
    key: app.appKey,
    // The tail of a bundle id is the closest thing to a name we still have.
    label: names[app.appKey] ?? app.appKey.split('.').pop() ?? app.appKey,
    seconds: app.seconds,
  }));
  if (own > 0) rows.push({ key: 'self', label: 'Focus Desk', seconds: own });

  return (
    <div className="mt-1.5 pl-2.5 space-y-0.5">
      {rows.map((row) => (
        <div key={row.key} className="flex items-baseline justify-between gap-2">
          <span className="t-faint text-[11px] truncate">{row.label}</span>
          <span className="t-faint text-[10px] tabular-nums shrink-0">
            {formatDuration(row.seconds)}
          </span>
        </div>
      ))}
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="glass p-4 rounded-2xl">
    <div className="t-accent flex items-center gap-1.5 mb-2">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</span>
    </div>
    <div className="t-ink text-xl font-semibold tabular-nums">{value}</div>
  </div>
);
