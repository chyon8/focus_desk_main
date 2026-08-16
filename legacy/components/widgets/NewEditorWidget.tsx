
import React, { useState } from 'react';
import { NewEditorWidgetData } from '../../types';
import { Eye, Pen, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  data: NewEditorWidgetData;
  updateWidget: (id: string, updates: Partial<NewEditorWidgetData>) => void;
}

export const NewEditorWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const [isPreview, setIsPreview] = useState(false);
  const isDark = data.theme === 'DARK';

  const toggleTheme = () => {
    updateWidget(data.id, { theme: isDark ? 'LIGHT' : 'DARK' });
  };

  return (
    <div className={`h-full w-full flex flex-col p-8 transition-colors duration-300 group ${isDark ? 'bg-[#18181b] text-zinc-200' : 'bg-white text-slate-900'}`}>
      {/* Refined Header */}
      <div className={`flex justify-between items-start mb-6 border-b pb-2 transition-colors ${isDark ? 'border-zinc-800' : 'border-gray-100'}`}>
        <input
            type="text"
            className={`bg-transparent border-none outline-none text-2xl font-bold w-full font-serif tracking-tight transition-colors ${isDark ? 'text-zinc-100 placeholder-zinc-700' : 'text-slate-900 placeholder-slate-300'}`}
            placeholder="Untitled Document"
            value={data.title}
            onChange={(e) => updateWidget(data.id, { title: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
        />
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4 pt-1">
             <button
                onClick={toggleTheme}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                title="Toggle Theme"
            >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
                onClick={() => setIsPreview(!isPreview)}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}
                title={isPreview ? "Edit" : "Preview"}
            >
                {isPreview ? <Pen size={16} /> : <Eye size={16} />}
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {isPreview ? (
            <div 
                className={`h-full w-full overflow-y-auto scrollbar-thin max-w-none prose prose-sm ${isDark ? 'scrollbar-thumb-zinc-700 prose-invert prose-p:text-zinc-300 prose-headings:text-zinc-100' : 'scrollbar-thumb-slate-200 prose-slate'}`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <ReactMarkdown>{data.content || '*No content*'}</ReactMarkdown>
            </div>
        ) : (
            <textarea
                className={`w-full h-full bg-transparent border-none outline-none resize-none text-lg leading-loose scrollbar-thin transition-colors ${isDark ? 'text-zinc-300 placeholder-zinc-700 scrollbar-thumb-zinc-700' : 'text-slate-700 placeholder-slate-300 scrollbar-thumb-slate-200'}`}
                placeholder="Start writing..."
                value={data.content}
                onChange={(e) => updateWidget(data.id, { content: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                spellCheck={false}
            />
        )}
      </div>

      <div className={`text-xs pt-3 mt-auto flex justify-between items-center transition-colors ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}>
        <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${data.content.length > 0 ? (isDark ? 'bg-indigo-500' : 'bg-green-400') : (isDark ? 'bg-zinc-700' : 'bg-slate-200')}`} />
            <span>Synced</span>
        </div>
        <div>
            Markdown Supported
        </div>
      </div>
    </div>
  );
};
