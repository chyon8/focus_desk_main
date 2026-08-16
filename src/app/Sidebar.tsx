import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BookOpen, ChevronLeft, Coffee, Home, Layout, Monitor, PanelLeft, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpaceStore } from '../stores/spaceStore';
import { SIDEBAR_WIDTH, useUiStore } from '../stores/uiStore';

function spaceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('study') || n.includes('read')) return <BookOpen size={16} />;
  if (n.includes('code') || n.includes('work')) return <Monitor size={16} />;
  if (n.includes('chill') || n.includes('relax')) return <Coffee size={16} />;
  return <Layout size={16} />;
}

const SpaceRow: React.FC<{ id: string; canDelete: boolean }> = ({ id, canDelete }) => {
  const name = useSpaceStore((s) => s.spaces[id]?.name ?? '');
  const isActive = useSpaceStore((s) => s.activeSpaceId === id);
  const setActiveSpace = useSpaceStore((s) => s.setActiveSpace);
  const removeSpace = useSpaceStore((s) => s.removeSpace);

  return (
    <button
      onClick={() => setActiveSpace(id)}
      className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
        isActive ? 'bg-white/10 text-white shadow-sm' : 'text-white/50 hover:bg-white/5 hover:text-white'
      }`}
    >
      <span className={isActive ? 'text-white' : 'text-white/40'}>{spaceIcon(name)}</span>
      <span className="flex-1 text-left truncate">{name}</span>
      {canDelete && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            removeSpace(id);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all text-white/40 hover:text-red-300"
        >
          <Trash2 size={12} />
        </span>
      )}
    </button>
  );
};

export const Sidebar: React.FC = () => {
  // Shared, because the canvas insets itself by the sidebar's width.
  const isOpen = useUiStore((s) => s.isSidebarOpen);
  const setIsOpen = useUiStore((s) => s.setSidebarOpen);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  // Select ids only. A selector that builds new objects would fail useShallow's
  // Object.is comparison on every render and loop forever (React #185).
  const spaceIds = useSpaceStore(useShallow((s) => Object.keys(s.spaces)));
  const addSpace = useSpaceStore((s) => s.addSpace);

  const create = () => {
    if (!newName.trim()) return;
    addSpace(newName);
    setNewName('');
    setIsCreating(false);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setIsOpen(true)}
            className="fixed top-9 left-6 z-50 p-2.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-lg"
          >
            <PanelLeft size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            style={{ width: SIDEBAR_WIDTH }}
            className="fixed left-0 top-0 bottom-0 z-50 flex flex-col p-3 bg-[#1e1e24]/90 backdrop-blur-3xl shadow-[4px_0_24px_rgba(0,0,0,0.2)]"
          >
            <div
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 mb-8 px-2 py-2 mt-2 cursor-pointer hover:bg-white/5 rounded-xl transition-colors group"
              title="Collapse sidebar"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 group-hover:bg-indigo-500/30 transition-colors">
                <Home size={16} />
              </div>
              <h1 className="text-sm font-bold tracking-wide text-white">Focus Desk</h1>
              <div className="ml-auto p-1.5 rounded-lg text-white/30 group-hover:text-white transition-colors">
                <ChevronLeft size={16} />
              </div>
            </div>

            <div className="text-[10px] font-bold uppercase tracking-widest px-3 mb-2 text-white/30">
              My Spaces
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 px-1">
              {spaceIds.map((id) => (
                <SpaceRow key={id} id={id} canDelete={spaceIds.length > 1} />
              ))}
            </div>

            {isCreating ? (
              <div className="mt-auto p-3 rounded-xl border bg-white/5 border-white/5">
                <input
                  autoFocus
                  placeholder="Name"
                  className="w-full bg-transparent border-b border-white/10 text-sm pb-1 mb-2 outline-none text-white placeholder-white/20 focus:border-indigo-500/50"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && create()}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-1 rounded-md text-[10px] text-white/40 hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={create}
                    className="flex-1 py-1 rounded-md text-[10px] font-medium bg-white/10 text-white hover:bg-white/20"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="mt-auto flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all text-sm font-medium text-white/30 hover:bg-white/5 hover:text-white"
              >
                <Plus size={16} />
                <span>New Space</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
