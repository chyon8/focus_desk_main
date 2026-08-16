
import React, { useEffect, useState } from 'react';
import { ClockWidgetData } from '../../types';
import { Moon, Sun } from 'lucide-react';

interface Props {
  data: ClockWidgetData;
  updateWidget: (id: string, updates: Partial<ClockWidgetData>) => void;
}

export const ClockWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const [time, setTime] = useState(new Date());
  const isDark = data.theme === 'DARK';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    updateWidget(data.id, { theme: isDark ? 'LIGHT' : 'DARK' });
  };

  const secondsRatio = time.getSeconds() / 60;
  const minutesRatio = (secondsRatio + time.getMinutes()) / 60;
  const hoursRatio = (minutesRatio + time.getHours()) / 12;

  return (
    <div className={`h-full w-full flex flex-col items-center justify-center relative p-6 transition-colors duration-500 ${isDark ? 'bg-[#18181b]' : 'bg-white'}`}>
      
      {/* Theme Toggle - Subtle */}
      <button 
        onClick={toggleTheme}
        className={`absolute top-4 right-4 p-2 rounded-full transition-all opacity-0 group-hover:opacity-100 ${isDark ? 'text-zinc-600 hover:bg-zinc-800 hover:text-zinc-200' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}
      >
        {isDark ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      {/* Clock Face */}
      <div 
        className={`relative w-56 h-56 rounded-full flex items-center justify-center transition-all duration-500 ${
          isDark 
            ? 'bg-[#202023] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),_0_20px_40px_-10px_rgba(0,0,0,0.5)]' 
            : 'bg-[#F9F9FB] shadow-[inset_0_2px_4px_rgba(255,255,255,0.8),_0_20px_40px_-10px_rgba(0,0,0,0.15)]'
        }`}
      >
        {/* Markers */}
        {[...Array(60)].map((_, i) => {
           const isHour = i % 5 === 0;
           return (
            <div 
                key={i}
                className={`absolute origin-bottom ${
                    isHour 
                        ? (isDark ? 'w-[2px] h-3 bg-zinc-500' : 'w-[2px] h-3 bg-slate-400') 
                        : (isDark ? 'w-[1px] h-1.5 bg-zinc-700' : 'w-[1px] h-1.5 bg-slate-200')
                }`}
                style={{ 
                top: '12px', 
                left: '50%', 
                transform: `translateX(-50%) rotate(${i * 6}deg)`, 
                transformOrigin: '50% 100px' // Radius - top margin
                }}
            />
           )
        })}

        {/* Numbers (Only 12, 3, 6, 9) - Modern Minimal */}
        {/* Removed for cleaner look */}

        {/* Hour Hand */}
        <div 
          className={`absolute w-1.5 h-14 rounded-full origin-bottom z-10 shadow-sm ${isDark ? 'bg-zinc-200' : 'bg-slate-800'}`}
          style={{ 
            bottom: '50%', 
            left: 'calc(50% - 3px)', 
            transform: `rotate(${hoursRatio * 360}deg)`,
            transition: 'transform 0.1s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
          }}
        />

        {/* Minute Hand */}
        <div 
          className={`absolute w-1 h-20 rounded-full origin-bottom z-10 shadow-sm ${isDark ? 'bg-zinc-400' : 'bg-slate-600'}`}
          style={{ 
            bottom: '50%', 
            left: 'calc(50% - 2px)', 
            transform: `rotate(${minutesRatio * 360}deg)`,
            transition: 'transform 0.1s cubic-bezier(0.4, 2.08, 0.55, 0.44)'
          }}
        />

        {/* Second Hand - Premium Accent */}
        <div 
          className="absolute w-0.5 h-24 rounded-full origin-bottom z-20 bg-orange-500"
          style={{ 
            bottom: '50%', 
            left: 'calc(50% - 1px)', 
            transform: `rotate(${secondsRatio * 360}deg)`,
            boxShadow: '0 0 4px rgba(249, 115, 22, 0.4)'
          }}
        >
            {/* Counterbalance Tail */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-1 h-4 bg-orange-500 rounded-full -mt-1" />
        </div>

        {/* Center Cap */}
        <div className={`absolute w-3 h-3 rounded-full z-30 shadow-md ${isDark ? 'bg-zinc-200' : 'bg-white'}`}>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-orange-500 rounded-full" />
        </div>
      </div>

      {/* Date Display */}
      <div className={`mt-8 text-xs font-medium tracking-widest uppercase opacity-60 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

    </div>
  );
};
