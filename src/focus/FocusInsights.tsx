import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, CheckCircle2, Clock, X } from 'lucide-react';
import { useFocusStore } from '../stores/focusStore';
import { useSpaceStore } from '../stores/spaceStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
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
  const spaceNames = useSpaceStore((s) => s.spaces);
  const tasksToday = useFocusStore((s) => s.stats[today]?.tasksCompleted ?? 0);

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
              </div>
            ))}
          </div>
        )}
      </motion.div>
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
