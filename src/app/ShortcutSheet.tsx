import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';

/** The whole keyboard surface, in one place. Keep it in step with `useKeyboardShortcuts`. */
const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Canvas',
    items: [
      ['K', 'Open anything — search'],
      ['N', 'Add a widget'],
      ['G', 'Arrange'],
      ['F', 'Fit'],
      ['M', 'Fullscreen'],
      ['Double-click', 'Add one right here'],
      ['?', 'This sheet'],
      ['Esc', 'Back out'],
    ],
  },
  {
    title: 'Move around',
    items: [
      ['Space + drag', 'Pan'],
      ['⌘ + scroll', 'Zoom'],
      ['Pinch a photo', 'Zoom the picture'],
      ['⌃⌥D', 'Desk ↔ app windows'],
    ],
  },
  {
    title: 'Pick widgets',
    items: [
      ['⌥ (hold)', 'Show what a click picks'],
      ['⌥ + click', 'Pick one'],
      ['Drag the canvas', 'Pick several'],
      ['⇧ + drag', 'Add to what is picked'],
      ['⌘D', 'Duplicate what is picked'],
    ],
  },
  {
    title: 'In a web page',
    items: [
      ['⇧K ⇧N ⇧G ⇧F ⇧M', 'The same five'],
      ['⌘+ ⌘− ⌘0', 'Page zoom'],
    ],
  },
];

const Key: React.FC<{ label: string }> = ({ label }) => (
  <kbd className="chrome-button t-ink shrink-0 px-2 py-1 rounded-md text-[11px] font-medium">
    {label}
  </kbd>
);

export const ShortcutSheet: React.FC = () => {
  const isOpen = useUiStore((s) => s.isShortcutsOpen);
  const close = useUiStore((s) => s.toggleShortcuts);
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[97] bg-black/40 backdrop-blur-[2px]" onClick={close} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="glass-panel fixed left-1/2 top-1/2 z-[98] w-[560px] max-w-[92vw] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5 rounded-2xl shadow-2xl"
      >
        <div className="flex items-baseline gap-3 mb-4">
          <h2 className="t-ink text-sm font-bold tracking-wide">Keyboard</h2>
          {/* The one rule behind the whole list, so the ⇧ column needs no
              explaining of its own. */}
          <span className="t-faint text-[11px]">
            Letters work on the canvas. Add ⇧ when a web page has focus.
          </span>
          <button
            onClick={close}
            title="Close"
            className="chrome-button t-faint ml-auto w-7 h-7 flex items-center justify-center rounded-md"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <div className="t-faint mb-2 text-[10px] font-bold uppercase tracking-widest">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map(([keys, what]) => (
                  <div key={keys} className="flex items-center gap-2 py-0.5">
                    <Key label={keys} />
                    <span className="t-faint text-[11px] leading-tight">{what}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
};
