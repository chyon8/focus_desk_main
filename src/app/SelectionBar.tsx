import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, LayoutGrid, Layers, Trash2, X } from 'lucide-react';
import { useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';

const Action: React.FC<{
  icon: React.ReactNode;
  label: string;
  title: string;
  danger?: boolean;
  onClick: () => void;
}> = ({ icon, label, title, danger, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    className={`chrome-button flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-medium ${
      danger ? 'hover:text-red-400' : ''
    }`}
  >
    {icon}
    {label}
  </button>
);

/**
 * What can be done to the widgets that are picked out, without knowing the
 * shortcuts. Only up while something is picked (D-087).
 */
export const SelectionBar: React.FC = () => {
  const selectedIds = useUiStore((s) => s.selectedIds);
  const count = selectedIds.length;

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="glass-panel fixed bottom-6 left-1/2 -translate-x-1/2 z-[96] flex items-center gap-2 pl-4 pr-2 py-2 rounded-2xl shadow-2xl"
        >
          <span className="t-ink text-xs">{count} selected</span>
          <span className="border-hair h-5 border-l" />
          <Action
            icon={<LayoutGrid size={13} />}
            label="Grid"
            title="Lay them out in a grid (G)"
            onClick={() => useSpaceStore.getState().arrangeWidgets('grid')}
          />
          <Action
            icon={<Layers size={13} />}
            label="Cascade"
            title="Stack them in a cascade"
            onClick={() => useSpaceStore.getState().arrangeWidgets('cascade')}
          />
          <Action
            icon={<Copy size={13} />}
            label="Duplicate"
            title="Copy them (⌘D)"
            onClick={() => useSpaceStore.getState().duplicateWidgets(selectedIds)}
          />
          <Action
            icon={<Trash2 size={13} />}
            label="Close"
            title="Close them — undoable for a few seconds"
            danger
            onClick={() => useSpaceStore.getState().removeWidgets(selectedIds)}
          />
          <button
            onClick={() => useUiStore.getState().clearSelection()}
            title="Drop the selection (Esc)"
            className="chrome-button w-7 h-7 flex items-center justify-center rounded-lg"
          >
            <X size={13} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
