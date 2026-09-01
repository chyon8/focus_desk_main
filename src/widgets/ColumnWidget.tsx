import React from 'react';
import { COLUMN_TITLE_HEIGHT } from '../canvas/columns';
import type { ColumnData } from '../spaces/types';
import { useWidgetData } from './useWidgetData';

/**
 * The panel a column draws under its cards. It holds the name and the count and
 * nothing else — the cards are ordinary widgets sitting on top of it, placed by
 * `applyColumn` rather than rendered from here.
 */
export const ColumnWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, update] = useWidgetData<ColumnData>(id);
  const count = data.children.length;

  return (
    <div className="h-full w-full flex flex-col">
      <div
        className="shrink-0 flex flex-col items-center justify-center px-3"
        style={{ height: COLUMN_TITLE_HEIGHT }}
      >
        <input
          value={data.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Untitled"
          spellCheck={false}
          className="t-ink w-full bg-transparent text-center text-[13px] font-medium outline-none placeholder:opacity-40"
        />
        <span className="t-faint text-[10px]">
          {count} {count === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {count === 0 && (
        <div className="t-faint flex flex-1 items-center justify-center text-[11px]">
          Drag a widget in
        </div>
      )}
    </div>
  );
};
