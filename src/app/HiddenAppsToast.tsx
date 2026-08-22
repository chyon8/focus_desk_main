import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const VISIBLE_MS = 6000;

/**
 * App windows sit on their widgets by keeping this window below them, which also
 * puts it below unrelated windows — so those apps are hidden when the desk comes
 * forward (D-072). Hiding someone's browser without saying so is not acceptable,
 * hence this.
 */
export const HiddenAppsToast: React.FC = () => {
  const [count, setCount] = useState(0);

  useEffect(() => window.apps?.onHidden(setCount), []);

  useEffect(() => {
    if (!count) return;
    const timer = setTimeout(() => setCount(0), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [count]);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="glass-panel fixed bottom-6 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-3 px-4 py-2 rounded-2xl shadow-2xl"
        >
          <span className="t-ink text-sm">
            {count === 1 ? '1 other app' : `${count} other apps`} hidden so this space stays
            visible
          </span>
          <span className="t-faint text-xs">Its Dock icon or ⌘Tab brings it back</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
