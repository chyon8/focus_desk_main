import React, { useState } from 'react';
import { Check, Play, Plus, X } from 'lucide-react';
import { TodoData } from '../spaces/types';
import { useFocusStore } from '../stores/focusStore';
import { useWidgetData } from './useWidgetData';

export const TodoWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<TodoData>(id);
  const [draft, setDraft] = useState('');

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
    <div className="t-ink h-full w-full flex flex-col p-6">
      <div className="flex gap-2 items-center mb-4">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="t-soft text-xs font-semibold uppercase tracking-widest">
          {remaining} left
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
        {data.items.map((item) => (
          <div
            key={item.id}
            className="row !text-[inherit] group flex items-center gap-3 px-2 py-2 rounded-lg"
          >
            <button
              onClick={() => toggle(item.id)}
              className="w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-all"
              style={
                item.done
                  ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--surface)' }
                  : { borderColor: 'var(--panel-border)' }
              }
            >
              {item.done && <Check size={12} strokeWidth={3} />}
            </button>

            <span
              className={`flex-1 text-sm leading-snug ${item.done ? 't-faint line-through' : ''}`}
            >
              {item.text}
            </span>

            {!item.done && (
              <button
                onClick={() => useFocusStore.getState().start(item.text)}
                title="Focus on this task"
                className="t-faint hover:!text-[var(--accent)] opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
              >
                <Play size={13} />
              </button>
            )}

            <button
              onClick={() => remove(item.id)}
              className="t-faint hover:!text-red-400 opacity-0 group-hover:opacity-100 p-1 rounded transition-all"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="border-hair flex items-center gap-2 mt-3 pt-3 border-t">
        <Plus size={16} className="t-faint" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a task"
          className="field flex-1 !bg-transparent outline-none text-sm"
        />
      </div>
    </div>
  );
};
