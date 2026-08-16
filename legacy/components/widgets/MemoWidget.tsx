import React from 'react';
import { MemoWidgetData } from '../../types';

interface Props {
  data: MemoWidgetData;
  updateWidget: (id: string, updates: Partial<MemoWidgetData>) => void;
}

export const MemoWidget: React.FC<Props> = ({ data, updateWidget }) => {
  return (
    <div className="h-full w-full flex flex-col p-4">
      <h3 className="text-sm font-medium text-white/70 mb-2 flex items-center gap-2">
        <span>Memo</span>
      </h3>
      <textarea
        className="flex-1 bg-transparent border-none outline-none resize-none text-white placeholder-white/40 text-sm leading-relaxed scrollbar-thin scrollbar-thumb-white/20"
        placeholder="Type your thoughts here..."
        value={data.content}
        onChange={(e) => updateWidget(data.id, { content: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()} // Allow selecting text without dragging widget
      />
    </div>
  );
};