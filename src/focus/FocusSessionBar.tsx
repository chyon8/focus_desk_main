import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, Square } from 'lucide-react';
import { useFocusStore } from '../stores/focusStore';
import { useUiStore } from '../stores/uiStore';
import { formatClock } from './stats';

/**
 * The running focus session, shown as a capsule at the top of the canvas.
 *
 * Nothing is shown while there is no session. There used to be a "Start focus"
 * button sitting there, and it went unused — a session starts from a task's ▶ in
 * a todo widget, which is where the user already is when they mean to start one.
 */
export const FocusSessionBar: React.FC = () => {
  const startedAt = useFocusStore((s) => s.startedAt);
  const banked = useFocusStore((s) => s.banked);
  const taskName = useFocusStore((s) => s.taskName);
  const [, forceTick] = useState(0);
  const isMaximized = useUiStore((s) => s.maximizedWidgetId !== null);

  const isActive = startedAt !== null || banked > 0;
  const isRunning = startedAt !== null;

  // Re-render once a second while the clock is moving.
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const { pause, resume, stop } = useFocusStore.getState();
  const elapsed = useFocusStore.getState().elapsed();

  return (
    // Maximised, the widget's header is the top bar and this moves up into it —
    // the middle of that row is empty. Not hidden: a running session is the one
    // thing on this strip that is still true while a page fills the screen.
    <div className={`fixed left-1/2 -translate-x-1/2 z-50 ${isMaximized ? 'top-0.5' : 'top-9'}`}>
      <AnimatePresence mode="wait">
        {isActive && (
          <motion.div
            key="running"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="chrome-button-on flex items-center gap-3 pl-4 pr-2 py-2 rounded-full border shadow-lg"
          >
            <span
              className={`w-2 h-2 rounded-full ${isRunning ? 'animate-pulse' : 'opacity-40'}`}
              style={{ background: 'currentColor' }}
            />
            <span className="t-ink text-sm font-mono font-semibold tabular-nums">
              {formatClock(elapsed)}
            </span>
            {taskName && <span className="t-soft text-xs max-w-40 truncate">{taskName}</span>}

            <button
              onClick={isRunning ? pause : resume}
              title={isRunning ? 'Pause' : 'Resume'}
              className="chrome-button p-1.5 rounded-full"
            >
              {isRunning ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              onClick={stop}
              title="Finish and record"
              className="chrome-button p-1.5 rounded-full"
            >
              <Square size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
