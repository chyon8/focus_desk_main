import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, Square, Timer as TimerIcon } from 'lucide-react';
import { useFocusStore } from '../stores/focusStore';
import { formatClock } from './stats';

/**
 * The running focus session, shown as a capsule at the top of the canvas.
 * Idle state is a single button; once running it takes over as the timer.
 */
export const FocusSessionBar: React.FC = () => {
  const startedAt = useFocusStore((s) => s.startedAt);
  const banked = useFocusStore((s) => s.banked);
  const taskName = useFocusStore((s) => s.taskName);
  const [, forceTick] = useState(0);

  const isActive = startedAt !== null || banked > 0;
  const isRunning = startedAt !== null;

  // Re-render once a second while the clock is moving.
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const { start, pause, resume, stop } = useFocusStore.getState();
  const elapsed = useFocusStore.getState().elapsed();

  return (
    <div className="fixed top-9 left-1/2 -translate-x-1/2 z-50">
      <AnimatePresence mode="wait">
        {!isActive ? (
          <motion.button
            key="idle"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            onClick={() => start()}
            className="glass chrome-button flex items-center gap-2 px-4 py-2 rounded-full shadow-lg"
          >
            <TimerIcon size={14} />
            <span className="text-xs font-medium">Start focus</span>
          </motion.button>
        ) : (
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
