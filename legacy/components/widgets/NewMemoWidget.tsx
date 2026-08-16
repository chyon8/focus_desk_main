
import React from 'react';
import { NewMemoWidgetData } from '../../types';
import { MoreHorizontal, Moon, Sun } from 'lucide-react';

interface Props {
  data: NewMemoWidgetData;
  updateWidget: (id: string, updates: Partial<NewMemoWidgetData>) => void;
}

export const NewMemoWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const isDark = data.theme === 'DARK';
  
  const toggleTheme = () => {
    updateWidget(data.id, { theme: isDark ? 'LIGHT' : 'DARK' });
  };

  return (
    <div className={`h-full w-full flex flex-col p-6 transition-colors duration-300 ${isDark ? 'bg-[#18181b] text-zinc-300' : 'bg-white text-slate-800'}`}>
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2 items-center">
            <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-yellow-400'}`} />
            <span className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Note</span>
        </div>
        <div className="flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
             <button onClick={toggleTheme} className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-500'}`}>
                {isDark ? <Sun size={14} /> : <Moon size={14} />}
             </button>
             <button className={`p-1.5 rounded-md transition-colors ${isDark ? 'hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300' : 'hover:bg-slate-100 text-slate-300 hover:text-slate-500'}`}>
                <MoreHorizontal size={16} />
             </button>
        </div>
      </div>
      <textarea
        className={`flex-1 bg-transparent border-none outline-none resize-none text-base leading-relaxed scrollbar-thin transition-colors duration-300 ${
            isDark 
            ? 'text-zinc-300 placeholder-zinc-700 scrollbar-thumb-zinc-700' 
            : 'text-slate-700 placeholder-slate-300 scrollbar-thumb-slate-200'
        }`}
        placeholder="Capture your ideas..."
        value={data.content}
        onChange={(e) => updateWidget(data.id, { content: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()} 
        style={{ fontFamily: '"Inter", sans-serif' }}
      />
      <div className={`text-[10px] mt-2 font-medium flex justify-end transition-colors ${isDark ? 'text-zinc-700' : 'text-slate-300'}`}>
        {data.content.length} chars
      </div>
    </div>
  );
};
