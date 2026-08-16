import React, { useState } from 'react';
import { Check, Moon, Play, Plus, Sun, X } from 'lucide-react';
import { TodoData } from '../spaces/types';
import { useFocusStore } from '../stores/focusStore';
import { useWidgetData } from './useWidgetData';

export const TodoWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<TodoData>(id);
  const [draft, setDraft] = useState('');
  const isDark = data.theme === 'DARK';

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    update({ items: [...data.items, { id: crypto.randomUUID(), text, done: false }] });
    setDraft('');
  };

  const toggle = (itemId: string) => {
    const item = data.items.find((i) => i.id === itemId);
    // Ticking a task off counts towards today's stats; un-ticking does not undo it.
    if (item && !item.done) useFocusStore.getState().completeTask();
    update({ items: data.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) });
  };

  const remove = (itemId: string) =>
    update({ items: data.items.filter((i) => i.id !== itemId) });

  const remaining = data.items.filter((i) => !i.done).length;

  return (
    <div
      className={`h-full w-full flex flex-col p-6 transition-colors duration-300 ${
        isDark ? 'bg-[#18181b] text-zinc-300' : 'bg-white text-slate-800'
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 items-center">
          <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-emerald-500' : 'bg-emerald-400'}`} />
          <span
            className={`text-xs font-semibold uppercase tracking-widest ${
              isDark ? 'text-zinc-500' : 'text-slate-400'
            }`}
          >
            {remaining} left
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

      <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
        {data.items.map((item) => (
          <div
            key={item.id}
            className={`group flex items-center gap-3 px-2 py-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-slate-50'
            }`}
          >
            <button
              onClick={() => toggle(item.id)}
              className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-all ${
                item.done
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : isDark
                    ? 'border-zinc-700 hover:border-emerald-500'
                    : 'border-slate-300 hover:border-emerald-500'
              }`}
            >
              {item.done && <Check size={12} strokeWidth={3} />}
            </button>

            <span
              className={`flex-1 text-sm leading-snug ${
                item.done
                  ? isDark
                    ? 'text-zinc-600 line-through'
                    : 'text-slate-300 line-through'
                  : ''
              }`}
            >
              {item.text}
            </span>

            {!item.done && (
              <button
                onClick={() => useFocusStore.getState().start(item.text)}
                title="Focus on this task"
                className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                  isDark ? 'text-zinc-600 hover:text-indigo-400' : 'text-slate-300 hover:text-indigo-500'
                }`}
              >
                <Play size={13} />
              </button>
            )}

            <button
              onClick={() => remove(item.id)}
              className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                isDark ? 'text-zinc-600 hover:text-red-400' : 'text-slate-300 hover:text-red-500'
              }`}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div
        className={`flex items-center gap-2 mt-3 pt-3 border-t ${
          isDark ? 'border-zinc-800' : 'border-slate-100'
        }`}
      >
        <Plus size={16} className={isDark ? 'text-zinc-600' : 'text-slate-300'} />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a task"
          className={`flex-1 bg-transparent outline-none text-sm ${
            isDark ? 'placeholder-zinc-700' : 'placeholder-slate-300'
          }`}
        />
      </div>
    </div>
  );
};
