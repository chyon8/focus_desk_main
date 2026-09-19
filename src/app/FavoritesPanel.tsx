import { hostOf } from '../widgets/browserAddress';
import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { MoreHorizontal, Plus, X } from 'lucide-react';
import { useWebAppStore, type WebApp } from '../stores/webappStore';

import { WebAppForm } from '../webapps/WebAppForm';
import { WebAppMark } from '../webapps/WebAppMark';
import { isComposing } from './ime';

/**
 * The saved favourites, in one place (2026-09-19 사용자).
 *
 * The picker inside a widget answers "what stands here"; this answers "what do I
 * keep". Keeping the second question out of the widget is what the sign-ins
 * panel already does, and a panel is also the only way to read the list without
 * putting a widget on the canvas for it.
 */
export const FavoritesPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const apps = useWebAppStore((s) => s.apps);
  const [form, setForm] = useState<WebApp | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const saved = useMemo(
    () => Object.values(apps).sort((a, b) => a.name.localeCompare(b.name)),
    [apps]
  );

  return (
    <>
      {/* In the middle, like the launcher and the shortcut sheet (2026-09-19
          사용자). A list that is sat down with is not a rail popover: the panel
          used to open beside a rail button that the user may not have pressed —
          a widget's "Manage in settings" put it in the opposite corner — and at
          21rem both the name and the address were cut. */}
      <div className="scrim-overlay fixed inset-0 z-[97] backdrop-blur-[2px]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        className="glass-panel fixed left-1/2 top-1/2 z-[98] w-[560px] max-w-[92vw] max-h-[80vh] -translate-x-1/2 -translate-y-1/2 flex flex-col p-4 rounded-surface"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="t-soft text-meta font-semibold uppercase tracking-widest">
            {form ? (apps[form.id] ? 'Edit favorite' : 'New favorite') : 'Favorites'}
          </span>
          <button onClick={onClose} className="press t-faint hover:t-ink ml-auto shrink-0">
            <X size={12} />
          </button>
        </div>

        {form ? (
          <div className="flex-1 min-h-0 flex flex-col pt-2">
            <WebAppForm
              draft={form}
              onCancel={() => setForm(null)}
              onSave={(draft) => {
                useWebAppStore.getState().save(draft);
                setForm(null);
              }}
            />
          </div>
        ) : (
          <>
            <p className="t-faint mb-3 text-meta leading-snug">
              Sites you keep. The Favorite widget puts one on the canvas as a page.
            </p>
            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
              {saved.length === 0 ? (
                <p className="t-faint px-1 py-2 text-meta">Nothing saved yet.</p>
              ) : (
                saved.map((app) => (
                  <Row
                    key={app.id}
                    app={app}
                    renaming={renaming === app.id}
                    onRename={() => setRenaming(app.id)}
                    onRenamed={(name) => {
                      if (name.trim()) useWebAppStore.getState().save({ ...app, name: name.trim() });
                      setRenaming(null);
                    }}
                    onAddress={() => setForm(app)}
                    onRemove={() => useWebAppStore.getState().remove(app.id)}
                  />
                ))
              )}
            </div>
            <div className="border-hair mt-1.5 pt-1.5 border-t">
              <button
                onClick={() => setForm({ id: crypto.randomUUID(), name: '', url: '', icon: null })}
                className="row press w-full flex items-center gap-2 px-2 py-2 rounded-control text-ui"
              >
                <Plus size={13} className="t-faint" />
                Add a favorite
              </button>
            </div>
          </>
        )}
      </motion.div>
    </>
  );
};

const MENU_WIDTH = 176;

/** One saved favourite. Renaming happens on the name itself, not in a box. */
const Row: React.FC<{
  app: WebApp;
  renaming: boolean;
  onRename: () => void;
  onRenamed: (name: string) => void;
  onAddress: () => void;
  onRemove: () => void;
}> = ({ app, renaming, onRename, onRenamed, onAddress, onRemove }) => {
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState(app.name);
  const menuButton = useRef<HTMLButtonElement>(null);

  const items = [
    { label: 'Rename', run: onRename },
    { label: 'Change address…', run: onAddress },
    { label: 'Remove', run: onRemove, danger: true },
  ];

  return (
    <div className="row flex items-center gap-3 px-2 py-2 rounded-control">
      <WebAppMark icon={app.icon} name={app.name} size={18} className="shrink-0" />
      {renaming ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => onRenamed(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isComposing(e)) onRenamed(draft);
            if (e.key === 'Escape') onRenamed(app.name);
          }}
          className="name-input min-w-0 flex-1 text-ui"
        />
      ) : (
        <span className="t-ink min-w-0 flex-1 text-ui truncate">{app.name}</span>
      )}
      <span className="t-faint shrink-0 max-w-[16rem] text-micro truncate">{hostOf(app.url)}</span>
      <button
        ref={menuButton}
        onClick={() => {
          const box = menuButton.current?.getBoundingClientRect();
          setMenuAt(box ? { x: box.right - MENU_WIDTH, y: box.bottom + 6 } : null);
        }}
        title="Rename, change address, remove"
        className="press t-faint hover:t-ink shrink-0"
      >
        <MoreHorizontal size={14} />
      </button>
      {menuAt &&
        /* On the body: the list scrolls, and a menu drawn inside it is cut off
           at the edge of the scrolling box. */
        createPortal(
          <>
            <div className="fixed inset-0 z-[100]" onPointerDown={() => setMenuAt(null)} />
            <div
              className="glass-panel fixed z-[101] p-1.5 rounded-surface"
              style={{ left: menuAt.x, top: menuAt.y, width: MENU_WIDTH }}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setMenuAt(null);
                    item.run();
                  }}
                  className={`row w-full px-2 py-1.5 rounded-control text-left text-meta ${
                    item.danger ? 't-danger' : 't-ink'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </>,
          document.body
        )}
    </div>
  );
};
