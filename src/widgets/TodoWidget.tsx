import React, { useState } from 'react';
import { Check, Play, Plus, X } from 'lucide-react';
import { TodoData } from '../spaces/types';
import { useFocusStore } from '../stores/focusStore';
import { isComposing } from '../app/ime';
import { useWidgetData } from './useWidgetData';

export const TodoWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<TodoData>(id);
  const [draft, setDraft] = useState('');
  // The task being rewritten, and what it says so far. A task was write-once
  // before this: a typo meant deleting it and adding it again.
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);

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

  /** Empty is treated as leaving it alone — deleting is the ✕, and it can miss. */
  const commitEdit = () => {
    if (!editing) return;
    const text = editing.text.trim();
    if (text) {
      update({ items: data.items.map((i) => (i.id === editing.id ? { ...i, text } : i)) });
    }
    setEditing(null);
  };

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

            {editing?.id === item.id ? (
              <input
                value={editing.text}
                autoFocus
                onChange={(e) => setEditing({ id: item.id, text: e.target.value })}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (isComposing(e)) return;
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(null);
                }}
                className="field flex-1 min-w-0 !bg-transparent outline-none text-sm leading-snug"
              />
            ) : (
              <button
                onClick={() => setEditing({ id: item.id, text: item.text })}
                title="Click to rewrite"
                className={`!text-[inherit] flex-1 min-w-0 text-left text-sm leading-snug ${
                  item.done ? 't-faint line-through' : ''
                }`}
              >
                {item.text}
              </button>
            )}

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
          onKeyDown={(e) => e.key === 'Enter' && !isComposing(e) && add()}
          placeholder="Add a task"
          className="field flex-1 !bg-transparent outline-none text-sm"
        />
      </div>
    </div>
  );
};
