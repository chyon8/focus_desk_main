import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';

interface ShortcutCheatsheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutCheatsheet: React.FC<ShortcutCheatsheetProps> = ({ isOpen, onClose }) => {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const mod = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      category: 'Widget Navigation',
      items: [
        { keys: [`${mod}`, '1-9'], description: 'Focus widget by index' },
        { keys: ['Esc'], description: 'Clear widget focus' },
      ]
    },
    {
      category: 'Widget Management',
      items: [
        { keys: [`${mod}`, 'W'], description: 'Close active widget' },
        { keys: [`${mod}`, 'M'], description: 'Toggle maximize widget' },
        { keys: [`${mod}`, 'G'], description: 'Auto-arrange in grid' },
      ]
    },
    {
      category: 'Focus Mode',
      items: [
        { keys: [`${mod}`, 'F'], description: 'Toggle focus mode' },
      ]
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 z-[9999] w-[500px] max-w-[90vw]"
          >
            <div className="bg-[#18181b] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Keyboard size={20} className="text-blue-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {shortcuts.map((section, idx) => (
                  <div key={idx} className={idx > 0 ? 'mt-6' : ''}>
                    <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                      {section.category}
                    </h3>
                    <div className="space-y-2">
                      {section.items.map((shortcut, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 transition-colors">
                          <span className="text-zinc-300">{shortcut.description}</span>
                          <div className="flex items-center gap-1">
                            {shortcut.keys.map((key, kIdx) => (
                              <React.Fragment key={kIdx}>
                                <kbd className="px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-md text-xs font-mono text-zinc-300 shadow-sm min-w-[32px] text-center">
                                  {key}
                                </kbd>
                                {kIdx < shortcut.keys.length - 1 && (
                                  <span className="text-zinc-500 text-sm mx-0.5">+</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-zinc-900/50 border-t border-white/10 text-center">
                <p className="text-xs text-zinc-500">
                  Press <kbd className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 font-mono">?</kbd> anytime to show this cheatsheet
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
