import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Flame, X } from 'lucide-react';
import { useFocusStore } from '../stores/focusStore';
import { formatDuration, recentDays, todayKey } from './stats';

export const FocusInsights: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const stats = useFocusStore((s) => s.stats);
  const week = recentDays(stats, 7);
  const today = stats[todayKey()];
  const peak = Math.max(1, ...week.map((d) => d.focusSeconds));
  const weekTotal = week.reduce((sum, d) => sum + d.focusSeconds, 0);

  return (
    <div className="scrim-overlay fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="glass-panel w-[520px] max-w-[90vw] p-6 rounded-3xl shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="t-soft text-sm font-bold uppercase tracking-widest">Focus Insights</h2>
          <button onClick={onClose} className="chrome-button p-1.5 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <Stat icon={<Flame size={14} />} label="Today" value={formatDuration(today?.focusSeconds ?? 0)} />
          <Stat icon={<CheckCircle2 size={14} />} label="Tasks today" value={String(today?.tasksCompleted ?? 0)} />
          <Stat icon={<Flame size={14} />} label="Last 7 days" value={formatDuration(weekTotal)} />
        </div>

        <div className="t-faint text-[10px] font-bold uppercase tracking-widest mb-3">This week</div>
        <div className="flex items-end justify-between gap-2 h-40">
          {week.map((day) => {
            const isToday = day.date === todayKey();
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="t-faint text-[9px] tabular-nums">
                  {day.focusSeconds > 0 ? formatDuration(day.focusSeconds) : ''}
                </span>
                <div
                  className="w-full rounded-t-md transition-colors"
                  style={{
                    height: `${Math.max(2, (day.focusSeconds / peak) * 100)}%`,
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
