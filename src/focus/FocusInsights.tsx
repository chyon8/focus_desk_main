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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-[520px] max-w-[90vw] p-6 rounded-3xl bg-[#1e1e24] border border-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">Focus Insights</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <Stat icon={<Flame size={14} />} label="Today" value={formatDuration(today?.focusSeconds ?? 0)} accent="text-orange-300" />
          <Stat icon={<CheckCircle2 size={14} />} label="Tasks today" value={String(today?.tasksCompleted ?? 0)} accent="text-emerald-300" />
          <Stat icon={<Flame size={14} />} label="Last 7 days" value={formatDuration(weekTotal)} accent="text-indigo-300" />
        </div>

        <div className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">This week</div>
        <div className="flex items-end justify-between gap-2 h-40">
          {week.map((day) => {
            const isToday = day.date === todayKey();
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[9px] tabular-nums text-white/30">
                  {day.focusSeconds > 0 ? formatDuration(day.focusSeconds) : ''}
                </span>
                <div
                  className={`w-full rounded-t-md transition-colors ${
                    isToday ? 'bg-indigo-400' : 'bg-white/15'
                  }`}
                  style={{ height: `${Math.max(2, (day.focusSeconds / peak) * 100)}%` }}
                />
                <span className={`text-[10px] ${isToday ? 'text-white' : 'text-white/30'}`}>
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

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; accent: string }> = ({
  icon,
  label,
  value,
  accent,
}) => (
  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
    <div className={`flex items-center gap-1.5 mb-2 ${accent}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</span>
    </div>
    <div className="text-xl font-semibold tabular-nums text-white">{value}</div>
  </div>
);
