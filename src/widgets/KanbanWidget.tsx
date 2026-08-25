import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { KanbanData } from '../spaces/types';
import { isComposing } from '../app/ime';
import { useWidgetData } from './useWidgetData';

type ColumnKey = keyof KanbanData['columns'];

// The three columns read as one family: same accent, increasing presence.
const COLUMNS: { key: ColumnKey; label: string; dot: number }[] = [
  { key: 'todo', label: 'To Do', dot: 0.3 },
  { key: 'doing', label: 'Doing', dot: 0.65 },
  { key: 'done', label: 'Done', dot: 1 },
];

export const KanbanWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<KanbanData>(id);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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
    <div className="t-ink h-full w-full flex flex-col p-5">
      <span className="t-soft text-xs font-semibold uppercase tracking-widest mb-4">Board</span>

      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        {COLUMNS.map(({ key, label, dot }) => (
          <div key={key} className="flex flex-col min-h-0">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent)', opacity: dot }}
              />
              <span className="t-soft text-[10px] font-bold uppercase tracking-wider">{label}</span>
              <span className="t-faint text-[10px] ml-auto">{data.columns[key].length}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {data.columns[key].map((card) => (
                <div
                  key={card.id}
                  className="glass group rounded-lg px-2.5 py-2 text-xs leading-snug transition-colors"
                >
                  <div className="flex items-start gap-1">
                    <span className="flex-1">{card.text}</span>
                    <button
                      onClick={() => removeCard(key, card.id)}
                      className="t-faint hover:!text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={11} />
                    </button>
                  </div>
                  <div className="flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {key !== 'todo' && (
                      <button
                        onClick={() => moveCard(key, card.id, -1)}
                        className="chrome-button text-[10px] px-1 rounded"
                      >
                        ←
                      </button>
                    )}
                    {key !== 'done' && (
                      <button
                        onClick={() => moveCard(key, card.id, 1)}
                        className="chrome-button text-[10px] px-1 rounded ml-auto"
                      >
                        →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1 mt-2">
              <Plus size={12} className="t-faint" />
              <input
                value={drafts[key] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [key]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && !isComposing(e) && addCard(key)}
                placeholder="Add"
                className="field flex-1 min-w-0 !bg-transparent outline-none text-xs"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
