import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useUiStore } from '../stores/uiStore';

/** Long enough to read a line and reach the button. */
const VISIBLE_MS = 6000;

/**
 * One line about something the app did off screen — a new tab laid down outside
 * the view, so far — with a way to go and look at it.
 *
 * It sits above the undo toast rather than sharing its slot: the two can be up
 * at once, and an undo that has to be found under something else is no undo.
 */
export const NoticeToast: React.FC = () => {
  const notice = useUiStore((s) => s.notice);
  const id = notice?.id;

  useEffect(() => {
    if (id === undefined) return;
    const timer = setTimeout(() => useUiStore.getState().dismissNotice(), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [id]);

  return (
    <AnimatePresence>
      {notice && (
        <motion.div
          key={notice.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className="glass-panel fixed bottom-20 left-1/2 -translate-x-1/2 z-[95] flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl shadow-2xl"
        >
          <span className="t-ink text-xs">{notice.label}</span>
          {notice.action && (
            <button
              onClick={() => {
                notice.action?.run();
                useUiStore.getState().dismissNotice();
              }}
              className="chrome-button-on px-3 h-7 rounded-lg text-[11px] font-medium"
            >
              {notice.action.label}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
