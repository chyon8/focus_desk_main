import React from 'react';
import { MemoData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

export const MemoWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<MemoData>(id);

  return (
    <div className="t-ink h-full w-full flex flex-col p-6">
      <div className="flex gap-2 items-center mb-3">
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
        <span className="t-soft text-xs font-semibold uppercase tracking-widest">Note</span>
      </div>

      <textarea
        className="field flex-1 !bg-transparent border-none outline-none resize-none text-base leading-relaxed"
        placeholder="Capture your ideas..."
        value={data.content}
        onChange={(e) => update({ content: e.target.value })}
      />

      <div className="t-faint text-[10px] mt-2 font-medium flex justify-end">
        {data.content.length} chars
      </div>
    </div>
  );
};
