import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';
import { CalendarData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CalendarWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<CalendarData>(id);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const isDark = data.theme === 'DARK';

  const today = new Date();
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const shiftMonth = (delta: number) => setViewMonth(new Date(year, month + delta, 1));

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      className={`h-full w-full flex flex-col p-5 transition-colors duration-300 ${
        isDark ? 'bg-[#18181b] text-zinc-300' : 'bg-white text-slate-800'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => shiftMonth(-1)}
          className={`p-1 rounded-md transition-colors ${
            isDark ? 'text-zinc-600 hover:text-zinc-200' : 'text-slate-300 hover:text-slate-600'
          }`}
        >
          <ChevronLeft size={16} />
        </button>

        <span className="text-sm font-semibold">
          {viewMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </span>

        <div className="flex items-center">
          <button
            onClick={() => shiftMonth(1)}
            className={`p-1 rounded-md transition-colors ${
              isDark ? 'text-zinc-600 hover:text-zinc-200' : 'text-slate-300 hover:text-slate-600'
            }`}
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => update({ theme: isDark ? 'LIGHT' : 'DARK' })}
            className={`p-1 rounded-md opacity-50 hover:opacity-100 transition-all ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}
          >
            {isDark ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day, i) => (
          <div
            key={i}
            className={`text-center text-[10px] font-bold ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1 auto-rows-fr">
        {cells.map((day, i) => {
          const isToday =
            day !== null &&
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <div key={i} className="flex items-center justify-center">
              {day !== null && (
                <span
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-xs tabular-nums transition-colors ${
                    isToday
                      ? 'bg-indigo-500 text-white font-semibold'
                      : isDark
                        ? 'text-zinc-400'
                        : 'text-slate-600'
                  }`}
                >
                  {day}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
