import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';
import { useWebAppStore } from '../stores/webappStore';
import { WIDGET_REGISTRY } from '../widgets/registry';

/** Long enough to notice the mistake, short enough not to sit there. */
const VISIBLE_MS = 8000;

/**
 * Closing a widget throws away everything in it — a memo's text included — and
 * there is no other way back. So every ✕ leaves this behind for a few seconds
 * (D-061). Deleting a space works the same way, and takes its logged time and
 * its logins with it, so nothing is actually deleted until this clears. Moving
 * widgets to another space is here too: they are off screen afterwards, so
 * without this there is no way to tell where they went. An arrange is last: it
 * only moves and resizes, but a desk placed by hand cannot be put back by hand.
 */
export const UndoToast: React.FC = () => {
  const removedWidget = useSpaceStore((s) => s.lastRemoved);
  const moved = useSpaceStore((s) => s.lastMoved);
  const arranged = useSpaceStore((s) => s.lastArranged);
  const removedSpace = useSpaceStore((s) => s.lastRemovedSpace);
  const removedFavorite = useWebAppStore((s) => s.lastRemoved);
  // The selection bar owns the bottom slot while it is up; the toast sits above it.
  const hasSelection = useUiStore((s) => s.selectedIds.length > 0);

  // A deleted space wins the slot: it is the larger of the two undos, and the
  // space it was in took the widget toast with it anyway.
  const entry = removedSpace
    ? {
        key: removedSpace.doc.id,
        label: `Deleted ${removedSpace.doc.name}`,
        undo: () => useSpaceStore.getState().undoRemoveSpace(),
        dismiss: () => useSpaceStore.getState().dismissRemovedSpace(),
      }
    : removedWidget
      ? {
          key: removedWidget.widgets.map((w) => w.id).join(),
          label:
            removedWidget.widgets.length === 1
              ? `Closed ${WIDGET_REGISTRY[removedWidget.widgets[0].type].label}`
              : `Closed ${removedWidget.widgets.length} widgets`,
          undo: () => useSpaceStore.getState().undoRemove(),
          dismiss: () => useSpaceStore.getState().dismissRemoved(),
        }
      : moved
        ? {
            key: moved.widgets.map((w) => w.id).join(),
            label: `Moved ${
              moved.widgets.length === 1
                ? WIDGET_REGISTRY[moved.widgets[0].type].label
                : `${moved.widgets.length} widgets`
            } to ${useSpaceStore.getState().spaces[moved.toSpaceId]?.name ?? 'another space'}`,
            undo: () => useSpaceStore.getState().undoMove(),
            dismiss: () => useSpaceStore.getState().dismissMoved(),
          }
        : arranged
          ? {
              key: `arrange-${Object.keys(arranged.boxes).join()}`,
              label: `Arranged ${Object.keys(arranged.boxes).length} widgets`,
              undo: () => useSpaceStore.getState().undoArrange(),
              dismiss: () => useSpaceStore.getState().dismissArranged(),
            }
          : removedFavorite
            ? {
                key: `favorite-${removedFavorite.id}`,
                label: `Removed ${removedFavorite.name}`,
                undo: () => useWebAppStore.getState().undoRemove(),
                dismiss: () => useWebAppStore.getState().dismissRemoved(),
              }
            : null;

  const key = entry?.key;
  const dismiss = entry?.dismiss;
  useEffect(() => {
    if (!dismiss) return;
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
    // Restarting the countdown is what a new key means; `dismiss` is rebuilt
    // every render and would restart it on every one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={`glass-panel fixed ${hasSelection ? 'bottom-20' : 'bottom-6'} left-1/2 -translate-x-1/2 z-[95] flex items-center gap-3 pl-4 pr-2 py-2 rounded-surface`}
        >
          <span className="t-ink text-ui">{entry.label}</span>
          <button
            onClick={entry.undo}
            className="chrome-button-on flex items-center gap-1.5 px-3 h-7 rounded-control text-meta font-medium"
          >
            <Undo2 size={13} />
            Undo
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
