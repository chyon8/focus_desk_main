import React, { useState } from 'react';
import { ExternalLink, Moon, Plus, Sun, X } from 'lucide-react';
import { BookmarksData } from '../spaces/types';
import { useSpaceStore } from '../stores/spaceStore';
import { useWidgetData } from './useWidgetData';

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const BookmarksWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<BookmarksData>(id);
  const [draft, setDraft] = useState('');
  const isDark = data.theme === 'DARK';

  const add = () => {
    const raw = draft.trim();
    if (!raw) return;
    const url = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
    update({ items: [...data.items, { id: crypto.randomUUID(), url, title: hostOf(url) }] });
    setDraft('');
  };

  // Opening a bookmark drops a browser widget on the canvas rather than leaving
  // the app — the whole point is keeping a project's pages in its space.
  const openOnCanvas = (url: string) => useSpaceStore.getState().addWidget('browser', { url });

  return (
    <div
      className={`h-full w-full flex flex-col p-5 transition-colors duration-300 ${
        isDark ? 'bg-[#18181b] text-zinc-300' : 'bg-white text-slate-800'
      }`}
    >
      <div className="flex justify-between items-center mb-3">
        <span
          className={`text-xs font-semibold uppercase tracking-widest ${
            isDark ? 'text-zinc-500' : 'text-slate-400'
          }`}
        >
          Links
        </span>
        <button
          onClick={() => update({ theme: isDark ? 'LIGHT' : 'DARK' })}
          className={`p-1.5 rounded-md opacity-50 hover:opacity-100 transition-all ${
            isDark ? 'text-zinc-500' : 'text-slate-400'
          }`}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
        {data.items.map((item) => (
          <div
            key={item.id}
            className={`group flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-zinc-800/60' : 'hover:bg-slate-50'
            }`}
          >
            <button
              onClick={() => openOnCanvas(item.url)}
              title="Open on canvas"
              className="flex-1 flex items-center gap-2 min-w-0 text-left"
            >
              <ExternalLink size={13} className={isDark ? 'text-zinc-600' : 'text-slate-300'} />
              <span className="text-sm truncate">{item.title}</span>
            </button>
            <button
              onClick={() => update({ items: data.items.filter((i) => i.id !== item.id) })}
              className={`opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
                isDark ? 'text-zinc-600 hover:text-red-400' : 'text-slate-300 hover:text-red-500'
              }`}
            >
              <X size={13} />
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
          placeholder="Paste a link"
          className={`flex-1 min-w-0 bg-transparent outline-none text-sm ${
            isDark ? 'placeholder-zinc-700' : 'placeholder-slate-300'
          }`}
        />
      </div>
    </div>
  );
};
