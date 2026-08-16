import React, { useState } from 'react';
import { Moon, Plus, Sun, X } from 'lucide-react';
import { KanbanData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

type ColumnKey = keyof KanbanData['columns'];

const COLUMNS: { key: ColumnKey; label: string; accent: string }[] = [
  { key: 'todo', label: 'To Do', accent: 'bg-slate-400' },
  { key: 'doing', label: 'Doing', accent: 'bg-amber-400' },
  { key: 'done', label: 'Done', accent: 'bg-emerald-400' },
];

export const KanbanWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<KanbanData>(id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const isDark = data.theme === 'DARK';

  const addCard = (column: ColumnKey) => {
    const text = (drafts[column] ?? '').trim();
    if (!text) return;
    update({
      columns: {
        ...data.columns,
        [column]: [...data.columns[column], { id: crypto.randomUUID(), text }],
      },
    });
    setDrafts({ ...drafts, [column]: '' });
  };

  const removeCard = (column: ColumnKey, cardId: string) =>
    update({
      columns: { ...data.columns, [column]: data.columns[column].filter((c) => c.id !== cardId) },
    });

  const moveCard = (from: ColumnKey, cardId: string, direction: 1 | -1) => {
    const order: ColumnKey[] = ['todo', 'doing', 'done'];
    const to = order[order.indexOf(from) + direction];
    if (!to) return;
    const card = data.columns[from].find((c) => c.id === cardId);
    if (!card) return;
    update({
      columns: {
        ...data.columns,
        [from]: data.columns[from].filter((c) => c.id !== cardId),
        [to]: [...data.columns[to], card],
      },
    });
  };

  return (
    <div
      className={`h-full w-full flex flex-col p-5 transition-colors duration-300 ${
        isDark ? 'bg-[#18181b] text-zinc-300' : 'bg-white text-slate-800'
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <span
          className={`text-xs font-semibold uppercase tracking-widest ${
            isDark ? 'text-zinc-500' : 'text-slate-400'
          }`}
        >
          Board
        </span>
        <button
          onClick={() => update({ theme: isDark ? 'LIGHT' : 'DARK' })}
          className={`p-1.5 rounded-md opacity-50 hover:opacity-100 transition-all ${
            isDark ? 'hover:bg-zinc-800 text-zinc-500' : 'hover:bg-slate-100 text-slate-400'
          }`}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        {COLUMNS.map(({ key, label, accent }) => (
          <div key={key} className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-1.5 h-1.5 rounded-full ${accent}`} />
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-zinc-500' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
              <span className={`text-[10px] ml-auto ${isDark ? 'text-zinc-700' : 'text-slate-300'}`}>
                {data.columns[key].length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {data.columns[key].map((card) => (
                <div
                  key={card.id}
                  className={`group rounded-lg px-2.5 py-2 text-xs leading-snug border transition-colors ${
                    isDark
                      ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                      : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-1">
                    <span className="flex-1">{card.text}</span>
                    <button
                      onClick={() => removeCard(key, card.id)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                        isDark ? 'text-zinc-600 hover:text-red-400' : 'text-slate-300 hover:text-red-500'
                      }`}
                    >
                      <X size={11} />
                    </button>
                  </div>
                  <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {key !== 'todo' && (
                      <button
                        onClick={() => moveCard(key, card.id, -1)}
                        className={`text-[10px] px-1 rounded ${
                          isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        ←
                      </button>
                    )}
                    {key !== 'done' && (
                      <button
                        onClick={() => moveCard(key, card.id, 1)}
                        className={`text-[10px] px-1 rounded ml-auto ${
                          isDark ? 'text-zinc-500 hover:text-zinc-200' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 mt-2">
              <Plus size={12} className={isDark ? 'text-zinc-700' : 'text-slate-300'} />
              <input
                value={drafts[key] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && addCard(key)}
                placeholder="Add"
                className={`flex-1 min-w-0 bg-transparent outline-none text-xs ${
                  isDark ? 'placeholder-zinc-700' : 'placeholder-slate-300'
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
