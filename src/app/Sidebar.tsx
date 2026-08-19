import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BarChart2, BookOpen, ChevronLeft, Coffee, Home, Layout, Monitor, PanelLeft, Plus, Scan, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration } from '../focus/stats';
import { useToday } from '../focus/useToday';
import { useSpaceStore } from '../stores/spaceStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { SIDEBAR_WIDTH, useUiStore } from '../stores/uiStore';
import { ArrangeMenu } from './ArrangeMenu';
import { WidgetPalette } from './WidgetPalette';

function spaceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('study') || n.includes('read')) return <BookOpen size={16} />;
  if (n.includes('code') || n.includes('work')) return <Monitor size={16} />;
  if (n.includes('chill') || n.includes('relax')) return <Coffee size={16} />;
  return <Layout size={16} />;
}

const SpaceRow: React.FC<{ id: string; canDelete: boolean; today: string }> = ({
  id,
  canDelete,
  today,
}) => {
  const name = useSpaceStore((s) => s.spaces[id]?.name ?? '');
  const isActive = useSpaceStore((s) => s.activeSpaceId === id);
  const setActiveSpace = useSpaceStore((s) => s.setActiveSpace);
  const removeSpace = useSpaceStore((s) => s.removeSpace);
  // Ticks up once a second while this is the space in front of the user.
  const seconds = useSpaceTimeStore((s) => s.time[id]?.[today] ?? 0);

  return (
    <button
      onClick={() => setActiveSpace(id)}
      className={`row w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
        isActive ? 'row-on shadow-sm' : ''
      }`}
    >
      <span className={isActive ? 't-ink' : 't-faint'}>{spaceIcon(name)}</span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block truncate">{name}</span>
        <span className="t-faint block text-[10px] font-normal tabular-nums">
          {seconds > 0 ? formatDuration(seconds) : '—'}
        </span>
      </span>
      {canDelete && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            removeSpace(id);
          }}
          className="t-faint opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:!text-red-300"
        >
          <Trash2 size={12} />
        </span>
      )}
    </button>
  );
};

export const Sidebar: React.FC<{ onOpenInsights: () => void }> = ({ onOpenInsights }) => {
  // Shared, because the canvas insets itself by the sidebar's width.
  const isOpen = useUiStore((s) => s.isSidebarOpen);
  const setIsOpen = useUiStore((s) => s.setSidebarOpen);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  // Select ids only. A selector that builds new objects would fail useShallow's
  // Object.is comparison on every render and loop forever (React #185).
  const spaceIds = useSpaceStore(useShallow((s) => Object.keys(s.spaces)));
  const addSpace = useSpaceStore((s) => s.addSpace);
  const fitToWidgets = useSpaceStore((s) => s.fitToWidgets);
  const zoom = useSpaceStore((s) => s.spaces[s.activeSpaceId]?.camera.zoom ?? 1);
  const today = useToday();
  const todayTotal = useSpaceTimeStore((s) =>
    spaceIds.reduce((sum, id) => sum + (s.time[id]?.[today] ?? 0), 0)
  );

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
            className="glass chrome-button fixed top-9 left-6 z-50 p-2.5 rounded-xl shadow-lg"
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
            className="glass-panel fixed left-0 top-0 bottom-0 z-50 flex flex-col p-3 border-y-0 border-l-0 shadow-[4px_0_24px_rgba(0,0,0,0.25)]"
          >
            <div
              onClick={() => setIsOpen(false)}
              className="row flex items-center gap-2 mb-8 px-2 py-2 mt-2 cursor-pointer rounded-xl group"
              title="Collapse sidebar"
            >
              <div className="chrome-button-on w-8 h-8 rounded-lg flex items-center justify-center border">
                <Home size={16} />
              </div>
              <h1 className="t-ink text-sm font-bold tracking-wide">Focus Desk</h1>
              <div className="t-faint ml-auto p-1.5 rounded-lg group-hover:opacity-100">
                <ChevronLeft size={16} />
              </div>
            </div>

            <div className="flex items-baseline justify-between px-3 mb-2">
              <span className="t-faint text-[10px] font-bold uppercase tracking-widest">
                My Spaces
              </span>
              <button
                onClick={onOpenInsights}
                title="Time here today — open focus insights"
                className="chrome-button t-faint flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] tabular-nums"
              >
                <BarChart2 size={11} />
                {formatDuration(todayTotal)}
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 px-1">
              {spaceIds.map((id) => (
                <SpaceRow key={id} id={id} canDelete={spaceIds.length > 1} today={today} />
              ))}
            </div>

            {isCreating ? (
              <div className="glass shrink-0 mt-3 p-3 rounded-xl">
                <input
                  autoFocus
                  placeholder="Name"
                  className="field border-hair w-full !bg-transparent border-b text-sm pb-1 mb-2 outline-none"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && create()}
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setIsCreating(false)}
                    className="row flex-1 py-1 rounded-md text-[10px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={create}
                    className="chrome-button-on flex-1 py-1 rounded-md text-[10px] font-medium"
                  >
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="row shrink-0 mt-3 flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium"
              >
                <Plus size={16} />
                <span>New Space</span>
              </button>
            )}
            <WidgetPalette />

            {/* Canvas tools. They were a floating bar across the bottom of the
                screen; the canvas is worth more than they are. */}
            <div className="border-hair shrink-0 mt-3 pt-3 flex items-center gap-1 border-t">
              <ArrangeMenu />
              <button
                onClick={fitToWidgets}
                title="Fit to widgets (F, or ⌥F inside a page)"
                className="chrome-button w-10 h-10 flex items-center justify-center rounded-xl active:scale-95"
              >
                <Scan size={18} />
              </button>
              <span className="t-faint ml-auto px-2 text-xs tabular-nums" title="Canvas zoom">
                {Math.round(zoom * 100)}%
              </span>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
