import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRightLeft, Copy, LayoutGrid, Layers, PanelTop, Plus, Trash2, X } from 'lucide-react';
import { useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';

const Action: React.FC<{
  icon: React.ReactNode;
  label: string;
  title: string;
  danger?: boolean;
  on?: boolean;
  onClick: () => void;
}> = ({ icon, label, title, danger, on, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    className={`chrome-button flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-medium ${
      danger ? 'hover:text-red-400' : ''
    } ${on ? 'row-on' : ''}`}
  >
    {icon}
    {label}
  </button>
);

/**
 * Where the picked widgets go. Sending them somewhere else is how a space that
 * has grown too full gets sorted, so it acts on the whole selection at once.
 */
const MoveMenu: React.FC<{ selectedIds: string[] }> = ({ selectedIds }) => {
  const spaces = useSpaceStore((s) => s.spaces);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  const [newName, setNewName] = useState('');

  const others = Object.values(spaces).filter((space) => space.id !== activeSpaceId);

  const moveTo = (spaceId: string) => {
    useSpaceStore.getState().moveWidgetsToSpace(selectedIds, spaceId);
    useUiStore.getState().closeMoveMenu();
  };

  const moveToNew = () => {
    const name = newName.trim();
    if (!name) return;
    // The space is made but not opened: the user is sorting this space out.
    const id = useSpaceStore.getState().addSpace(name, false);
    moveTo(id);
  };

  return (
    <>
      <div className="fixed inset-0 z-[97]" onClick={() => useUiStore.getState().closeMoveMenu()} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        className="glass-panel absolute bottom-full mb-3 left-0 z-[98] w-60 p-2 rounded-2xl shadow-2xl"
      >
        <div className="t-faint px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest">
          Move to
        </div>

        <div className="max-h-60 overflow-y-auto">
          {others.map((space) => (
            <button
              key={space.id}
              onClick={() => moveTo(space.id)}
              className="row w-full flex items-center gap-3 px-2 py-2 rounded-xl"
            >
              <span className="flex-1 text-left text-xs font-medium truncate">{space.name}</span>
              <span className="t-faint text-[10px] tabular-nums">
                {Object.keys(space.widgets).length}
              </span>
            </button>
          ))}
          {others.length === 0 && (
            <div className="t-faint px-2 pb-2 text-[11px]">This is the only space.</div>
          )}
        </div>

        <div className="bg-hair my-1 h-px" />

        <div className="flex items-center gap-1 px-1 py-1">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') moveToNew();
              e.stopPropagation();
            }}
            placeholder="New space…"
            className="field flex-1 min-w-0 px-2 h-8 rounded-lg text-xs"
          />
          <button
            onClick={moveToNew}
            disabled={!newName.trim()}
            title="Make a space and move them there"
            className="chrome-button w-8 h-8 flex items-center justify-center rounded-lg disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>
      </motion.div>
    </>
  );
};

/**
 * What can be done to the widgets that are picked out, without knowing the
 * shortcuts. Only up while something is picked (D-087).
 */
export const SelectionBar: React.FC = () => {
  const selectedIds = useUiStore((s) => s.selectedIds);
  const isMoveMenuOpen = useUiStore((s) => s.isMoveMenuOpen);
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
            icon={<PanelTop size={13} />}
            label="Focus"
            title="The two used last go big, the rest share the grid"
            onClick={() => useSpaceStore.getState().arrangeWidgets('focus')}
          />
          <Action
            icon={<Layers size={13} />}
            label="Cascade"
            title="Stack them in a cascade"
            onClick={() => useSpaceStore.getState().arrangeWidgets('cascade')}
          />
          <div className="relative">
            <Action
              icon={<ArrowRightLeft size={13} />}
              label="Move"
              title="Send them to another space"
              on={isMoveMenuOpen}
              onClick={() => {
                const ui = useUiStore.getState();
                if (ui.isMoveMenuOpen) ui.closeMoveMenu();
                else ui.openMoveMenu();
              }}
            />
            <AnimatePresence>
              {isMoveMenuOpen && <MoveMenu selectedIds={selectedIds} />}
            </AnimatePresence>
          </div>
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
