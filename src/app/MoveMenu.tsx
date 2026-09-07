import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';

/**
 * Where the picked widgets go. Sending them somewhere else is how a space that
 * has grown too full gets sorted, so it acts on the whole selection at once.
 */
export const MoveMenu: React.FC<{ selectedIds: string[] }> = ({ selectedIds }) => {
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
        className="glass-panel absolute bottom-full mb-3 left-0 z-[98] w-60 p-2 rounded-surface"
      >
        <div className="t-faint px-2 pt-1 pb-2 text-micro font-bold uppercase tracking-widest">
          Move to
        </div>

        <div className="max-h-60 overflow-y-auto">
          {others.map((space) => (
            <button
              key={space.id}
              onClick={() => moveTo(space.id)}
              className="row w-full flex items-center gap-3 px-2 py-2 rounded-control"
            >
              <span className="flex-1 text-left text-ui font-medium truncate">{space.name}</span>
              <span className="t-faint text-micro tabular-nums">
                {Object.keys(space.widgets).length}
              </span>
            </button>
          ))}
          {others.length === 0 && (
            <div className="t-faint px-2 pb-2 text-meta">This is the only space.</div>
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
            className="field flex-1 min-w-0 px-2 h-8 rounded-control text-ui"
          />
          <button
            onClick={moveToNew}
            disabled={!newName.trim()}
            title="Make a space and move them there"
            className="chrome-button w-8 h-8 flex items-center justify-center rounded-control disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>
      </motion.div>
    </>
  );
};
