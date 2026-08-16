import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { ClockData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

export const ClockWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<ClockData>(id);
  const [time, setTime] = useState(() => new Date());
  const isDark = data.theme === 'DARK';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsRatio = time.getSeconds() / 60;
  const minutesRatio = (secondsRatio + time.getMinutes()) / 60;
  const hoursRatio = (minutesRatio + time.getHours()) / 12;

  return (
    <div
      className={`group h-full w-full flex flex-col items-center justify-center relative p-6 transition-colors duration-500 ${
        isDark ? 'bg-[#18181b]' : 'bg-white'
      }`}
    >
      <button
        onClick={() => update({ theme: isDark ? 'LIGHT' : 'DARK' })}
        className={`absolute top-4 right-4 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 ${
          isDark ? 'text-zinc-600 hover:bg-zinc-800' : 'text-slate-300 hover:bg-slate-100'
        }`}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      <div
        className={`relative w-56 h-56 rounded-full flex items-center justify-center transition-all duration-500 ${
          isDark
            ? 'bg-[#202023] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]'
            : 'bg-[#F9F9FB] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_20px_40px_-10px_rgba(0,0,0,0.15)]'
        }`}
      >
        {Array.from({ length: 60 }, (_, i) => {
          const isHour = i % 5 === 0;
          return (
            <div
              key={i}
              className={`absolute origin-bottom ${
                isHour
                  ? isDark
                    ? 'w-[2px] h-3 bg-zinc-500'
                    : 'w-[2px] h-3 bg-slate-400'
                  : isDark
                    ? 'w-[1px] h-1.5 bg-zinc-700'
                    : 'w-[1px] h-1.5 bg-slate-200'
              }`}
              style={{
                top: '12px',
                left: '50%',
                transform: `translateX(-50%) rotate(${i * 6}deg)`,
                transformOrigin: '50% 100px',
              }}
            />
          );
        })}

        <div
          className={`absolute w-1.5 h-14 rounded-full origin-bottom z-10 shadow-sm ${
            isDark ? 'bg-zinc-200' : 'bg-slate-800'
          }`}
          style={{
            bottom: '50%',
            left: 'calc(50% - 3px)',
            transform: `rotate(${hoursRatio * 360}deg)`,
          }}
        />
        <div
          className={`absolute w-1 h-20 rounded-full origin-bottom z-10 shadow-sm ${
            isDark ? 'bg-zinc-400' : 'bg-slate-600'
          }`}
          style={{
            bottom: '50%',
            left: 'calc(50% - 2px)',
            transform: `rotate(${minutesRatio * 360}deg)`,
          }}
        />
        <div
          className="absolute w-0.5 h-24 rounded-full origin-bottom z-20 bg-orange-500"
          style={{
            bottom: '50%',
            left: 'calc(50% - 1px)',
            transform: `rotate(${secondsRatio * 360}deg)`,
            boxShadow: '0 0 4px rgba(249, 115, 22, 0.4)',
          }}
        >
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-4 bg-orange-500 rounded-full -mt-1" />
        </div>

        <div
          className={`absolute w-3 h-3 rounded-full z-30 shadow-md ${
            isDark ? 'bg-zinc-200' : 'bg-white'
          }`}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-orange-500 rounded-full" />
        </div>
      </div>

      <div
        className={`mt-8 text-xs font-medium tracking-widest uppercase opacity-60 ${
          isDark ? 'text-zinc-500' : 'text-slate-400'
        }`}
      >
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
};
