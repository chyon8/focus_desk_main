import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { MemoData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

export const MemoWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<MemoData>(id);
  const isDark = data.theme === 'DARK';

  return (
    <div
      className={`h-full w-full flex flex-col p-6 transition-colors duration-300 ${
        isDark ? 'bg-[#18181b] text-zinc-300' : 'bg-white text-slate-800'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2 items-center">
          <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-yellow-400'}`} />
          <span
            className={`text-xs font-semibold uppercase tracking-widest ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}
          >
            Note
          </span>
        </div>
        <button
          onClick={() => update({ theme: isDark ? 'LIGHT' : 'DARK' })}
          className={`p-1.5 rounded-md opacity-50 hover:opacity-100 transition-all ${
            isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'
          }`}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      <textarea
        className={`flex-1 bg-transparent border-none outline-none resize-none text-base leading-relaxed ${
          isDark ? 'text-zinc-300 placeholder-zinc-700' : 'text-slate-700 placeholder-slate-300'
        }`}
        placeholder="Capture your ideas..."
        value={data.content}
        onChange={(e) => update({ content: e.target.value })}
      />

      <div
        className={`text-[10px] mt-2 font-medium flex justify-end ${
          isDark ? 'text-zinc-700' : 'text-slate-300'
        }`}
      >
        {data.content.length} chars
      </div>
    </div>
  );
};
