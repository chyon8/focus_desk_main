
import React, { useState } from 'react';
import { CalendarWidgetData } from '../../types';
import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';

interface Props {
  data: CalendarWidgetData;
  updateWidget: (id: string, updates: Partial<CalendarWidgetData>) => void;
}

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const CalendarWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const isDark = data.theme === 'DARK';

  const toggleTheme = () => {
    updateWidget(data.id, { theme: isDark ? 'LIGHT' : 'DARK' });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  return (
    <div className={`h-full w-full flex flex-col p-6 transition-colors duration-500 ${isDark ? 'bg-[#18181b] text-zinc-300' : 'bg-white text-slate-800'}`}>
      
      {/* Header */}
      <div className="flex items-end justify-between mb-8 px-1">
        <div className="flex flex-col">
           <span className={`text-xs font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
             {currentDate.getFullYear()}
           </span>
           <span className={`text-2xl font-serif font-medium ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
             {monthName}
           </span>
        </div>
        
        <div className="flex items-center gap-2 pb-1">
           <button onClick={toggleTheme} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-600 hover:text-zinc-300' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50'}`}>
             {isDark ? <Sun size={14} /> : <Moon size={14} />}
           </button>
           <div className={`h-4 w-px mx-1 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />
           <button onClick={prevMonth} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
             <ChevronLeft size={16} />
           </button>
           <button onClick={nextMonth} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400 hover:text-zinc-200' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
             <ChevronRight size={16} />
           </button>
        </div>
      </div>

      {/* Days Header */}
      <div className="grid grid-cols-7 mb-4">
        {DAYS.map((day, i) => (
          <div key={i} className={`text-center text-[10px] font-bold ${i === 0 || i === 6 ? 'opacity-50' : 'opacity-100'} ${isDark ? 'text-zinc-600' : 'text-slate-400'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-2 gap-x-1 flex-1 content-start">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = isCurrentMonth && day === today.getDate();
          
          return (
            <div key={day} className="flex justify-center relative group">
               {isToday && (
                  <div className={`absolute inset-0 m-auto w-8 h-8 rounded-full z-0 ${isDark ? 'bg-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-indigo-50 shadow-sm'}`} />
               )}
               <button 
                  className={`
                    w-8 h-8 flex items-center justify-center text-sm rounded-full z-10 transition-all duration-300 relative
                    ${isToday 
                      ? (isDark ? 'text-indigo-300 font-bold' : 'text-indigo-600 font-bold') 
                      : (isDark ? 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')
                    }
                  `}
                >
                  {day}
                  {isToday && <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'}`} />}
                </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
