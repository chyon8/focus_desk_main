import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { useSpaceStore } from '../stores/spaceStore';
import { WIDGET_REGISTRY } from '../widgets/registry';

/** Long enough to notice the mistake, short enough not to sit there. */
const VISIBLE_MS = 8000;

/**
 * Closing a widget throws away everything in it — a memo's text included — and
 * there is no other way back. So every ✕ leaves this behind for a few seconds
 * (D-061).
 */
export const UndoToast: React.FC = () => {
  const removed = useSpaceStore((s) => s.lastRemoved);

  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => useSpaceStore.getState().dismissRemoved(), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [removed]);

  return (
    <AnimatePresence>
      {removed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="glass-panel fixed bottom-6 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl shadow-2xl"
        >
          <span className="t-ink text-xs">
            Closed {WIDGET_REGISTRY[removed.widget.type].label}
          </span>
          <button
            onClick={() => useSpaceStore.getState().undoRemove()}
            className="chrome-button-on flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-medium"
          >
            <Undo2 size={13} />
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
