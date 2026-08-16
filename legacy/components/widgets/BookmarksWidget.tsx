import React, { useState } from 'react';
import { BookmarksWidgetData } from '../../types';
import { ExternalLink, Plus, Trash2, Globe } from 'lucide-react';

interface Props {
  data: BookmarksWidgetData;
  updateWidget: (id: string, updates: Partial<BookmarksWidgetData>) => void;
}

export const BookmarksWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const addBookmark = () => {
    if (!newUrl) return;
    let formattedUrl = newUrl;
    if (!/^https?:\/\//i.test(formattedUrl)) {
        formattedUrl = 'https://' + formattedUrl;
    }

    try {
      const urlObj = new URL(formattedUrl);
      const newBookmark = {
        id: crypto.randomUUID(),
        title: urlObj.hostname.replace('www.', ''),
        url: formattedUrl
      };
      updateWidget(data.id, { items: [...data.items, newBookmark] });
      setNewUrl('');
      setIsAdding(false);
    } catch (e) {
      alert('Invalid URL');
    }
  };

  const deleteBookmark = (id: string) => {
    updateWidget(data.id, { items: data.items.filter(i => i.id !== id) });
  };

  return (
    <div className="h-full w-full flex flex-col p-4">
       <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center justify-between">
        <span>Quick Links</span>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-white/60 hover:text-white transition-colors p-1"
        >
          <Plus size={16} />
        </button>
      </h3>

      {isAdding && (
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addBookmark()}
            placeholder="google.com"
            className="flex-1 bg-white/5 rounded px-2 py-1 text-xs text-white outline-none border border-white/10"
            onMouseDown={(e) => e.stopPropagation()}
            autoFocus
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-white/20 pr-1">
        {data.items.map(item => (
          <div key={item.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center text-white/50 shrink-0">
               <img 
                src={`https://www.google.com/s2/favicons?domain=${item.url}&sz=32`} 
                alt="fav" 
                className="w-4 h-4 opacity-70"
                onError={(e) => (e.currentTarget.style.display = 'none')}
               />
               <Globe size={14} className="absolute" style={{zIndex: -1}} />
            </div>
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 text-sm text-white/80 hover:text-white truncate"
              onMouseDown={(e) => e.stopPropagation()} // Allow clicking link without dragging
            >
              {item.title}
            </a>
            <button 
              onClick={() => deleteBookmark(item.id)}
              className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-300 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
         {data.items.length === 0 && !isAdding && (
          <div className="text-white/30 text-xs text-center py-4 italic">No links added</div>
        )}
      </div>
    </div>
  );
};