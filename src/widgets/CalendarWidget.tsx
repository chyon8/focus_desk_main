import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CalendarWidget: React.FC = () => {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

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
    <div className="t-ink h-full w-full flex flex-col p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shiftMonth(-1)} className="chrome-button p-1 rounded-md">
          <ChevronLeft size={16} />
        </button>

        <span className="text-sm font-semibold">
          {viewMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </span>

        <button onClick={() => shiftMonth(1)} className="chrome-button p-1 rounded-md">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day, i) => (
          <div key={i} className="t-faint text-center text-[10px] font-bold">
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
                    isToday ? 'font-semibold' : 't-soft'
                  }`}
                  style={
                    isToday
                      ? { background: 'var(--accent)', color: 'var(--surface)' }
                      : undefined
                  }
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
