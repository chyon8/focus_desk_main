
import React, { useState } from 'react';
import { EditorWidgetData } from '../../types';
import { Eye, Pen, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  data: EditorWidgetData;
  updateWidget: (id: string, updates: Partial<EditorWidgetData>) => void;
}

export const EditorWidget: React.FC<Props> = ({ data, updateWidget }) => {
  const [isPreview, setIsPreview] = useState(false);

  return (
    <div className="h-full w-full flex flex-col p-6 relative group">
      {/* Header / Controls */}
      <div className="flex justify-between items-center mb-4">
        <input
            type="text"
            className="bg-transparent border-none outline-none text-xl font-semibold text-white placeholder-white/50 w-full"
            placeholder="Untitled"
            value={data.title}
            onChange={(e) => updateWidget(data.id, { title: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
        />
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
                onClick={() => setIsPreview(!isPreview)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title={isPreview ? "Edit" : "Preview Markdown"}
            >
                {isPreview ? <Pen size={16} /> : <Eye size={16} />}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isPreview ? (
            <div 
                className="h-full w-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-white/90 prose-strong:text-white prose-a:text-indigo-300"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <ReactMarkdown>{data.content || '*No content*'}</ReactMarkdown>
            </div>
        ) : (
            <textarea
                className="w-full h-full bg-transparent border-none outline-none resize-none text-white/90 placeholder-white/30 text-base leading-relaxed scrollbar-thin scrollbar-thumb-white/20 font-serif"
                placeholder="Start writing... (Markdown supported)"
                value={data.content}
                onChange={(e) => updateWidget(data.id, { content: e.target.value })}
                onMouseDown={(e) => e.stopPropagation()}
                spellCheck={false}
            />
        )}
      </div>

      <div className="text-xs text-white/30 pt-2 flex justify-between items-center border-t border-white/10 mt-2">
        <div className="flex items-center gap-1">
            <FileText size={10} />
            <span>Markdown Supported</span>
        </div>
        <div>
            {data.content.length} chars
        </div>
      </div>
    </div>
  );
};