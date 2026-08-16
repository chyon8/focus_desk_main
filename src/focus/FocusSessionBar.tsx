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
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all shadow-lg"
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
            className="flex items-center gap-3 pl-4 pr-2 py-2 rounded-full bg-indigo-500/25 backdrop-blur-xl border border-indigo-400/30 shadow-lg"
          >
            <span
              className={`w-2 h-2 rounded-full ${isRunning ? 'bg-indigo-300 animate-pulse' : 'bg-white/30'}`}
            />
            <span className="text-sm font-mono font-semibold tabular-nums text-white">
              {formatClock(elapsed)}
            </span>
            {taskName && <span className="text-xs text-white/60 max-w-40 truncate">{taskName}</span>}

            <button
              onClick={isRunning ? pause : resume}
              title={isRunning ? 'Pause' : 'Resume'}
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isRunning ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              onClick={stop}
              title="Finish and record"
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Square size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
