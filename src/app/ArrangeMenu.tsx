import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layers, LayoutGrid, PanelTop } from 'lucide-react';
import { autoColumns } from '../canvas/layout';
import { useSpaceStore } from '../stores/spaceStore';
import { canvasArea } from '../stores/uiStore';

const COLUMN_CHOICES = [1, 2, 3, 4, 5];

/** Miniature preview of the resulting layout. */
const GridPreview: React.FC<{ columns: number }> = ({ columns }) => (
  <div className="grid gap-[2px] w-6" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
    {Array.from({ length: columns * 2 }, (_, i) => (
      <span key={i} className="h-[4px] rounded-[1px] bg-current opacity-60" />
    ))}
  </div>
);

export const ArrangeMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const arrangeWidgets = useSpaceStore((s) => s.arrangeWidgets);
  // What "Auto" will pick, so the label is honest about the result.
  const columnsForAuto = useSpaceStore((s) => {
    const widgets = Object.values(s.spaces[s.activeSpaceId]?.widgets ?? {});
    return widgets.length ? autoColumns(widgets, canvasArea()) : 1;
  });
  const runGrid = (columns?: number) => {
    arrangeWidgets('grid', columns);
    setIsOpen(false);
  };

  const runFocus = () => {
    arrangeWidgets('focus');
    setIsOpen(false);
  };

  const runCascade = () => {
    arrangeWidgets('cascade');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Arrange (G, or ⌥G inside a page)"
        className={`row w-full flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg active:scale-95 ${
          isOpen ? 'row-on' : ''
        }`}
      >
        <LayoutGrid size={18} />
        <span className="text-[9px] leading-none tracking-wide">Arrange</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-[80]" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="glass-panel absolute bottom-full mb-3 left-0 z-[90] w-52 p-2 rounded-2xl shadow-2xl"
            >
              <div className="t-faint px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest">
                Columns
              </div>

              <button
                onClick={() => runGrid()}
                className="row w-full flex items-center gap-3 px-2 py-2 rounded-xl"
              >
                <GridPreview columns={columnsForAuto} />
                <span className="flex-1 text-left text-xs font-medium">Auto</span>
                <span className="t-faint text-[10px]">{columnsForAuto} wide</span>
              </button>

              <div className="grid grid-cols-5 gap-1 px-1 pt-1">
                {COLUMN_CHOICES.map((columns) => (
                  <button
                    key={columns}
                    onClick={() => runGrid(columns)}
                    title={`${columns} column${columns > 1 ? 's' : ''}`}
                    className="chrome-button h-9 flex items-center justify-center rounded-lg text-xs font-medium tabular-nums"
                  >
                    {columns}
                  </button>
                ))}
              </div>

              <div className="bg-hair my-1 h-px" />

              <button
                onClick={runFocus}
                className="row w-full flex items-center gap-3 px-2 py-2 rounded-xl"
              >
                <PanelTop size={15} />
                <span className="flex-1 text-left text-xs font-medium">Focus</span>
                <span className="t-faint text-[10px]">Last two big</span>
              </button>

              <button
                onClick={runCascade}
                className="row w-full flex items-center gap-3 px-2 py-2 rounded-xl"
              >
                <Layers size={15} />
                <span className="flex-1 text-left text-xs font-medium">Cascade</span>
                <span className="t-faint text-[10px]">Overlapping</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
