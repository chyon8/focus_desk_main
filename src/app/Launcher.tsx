import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CornerDownLeft, Search } from 'lucide-react';
import type { AppData } from '../spaces/types';
import { ranked, useSiteVisitStore } from '../stores/siteVisitStore';
import { useSpaceStore } from '../stores/spaceStore';
import { useUiStore } from '../stores/uiStore';
import { useWebAppStore } from '../stores/webappStore';
import { WebAppMark } from '../webapps/WebAppMark';
import { buildLauncherSections, LauncherItem, LauncherMark } from './launcherItems';

const Mark: React.FC<{ mark: LauncherMark }> = ({ mark }) => {
  if (mark.kind === 'lucide') return <mark.icon size={16} className="t-soft shrink-0" />;
  if (mark.kind === 'webapp')
    return <WebAppMark icon={mark.icon} name={mark.name} size={18} className="shrink-0" />;
  if (mark.kind === 'image')
    return mark.src ? (
      <img src={mark.src} alt="" className="w-[18px] h-[18px] shrink-0" draggable={false} />
    ) : (
      <div className="glass w-[18px] h-[18px] rounded shrink-0" />
    );
  return (
    <span className="glass t-ink w-[18px] h-[18px] rounded-[22%] flex items-center justify-center text-[10px] uppercase shrink-0">
      {mark.text}
    </span>
  );
};

/**
 * One keystroke to any tool (K).
 *
 * A space hides its tools the way a desk does — everything is a widget that has
 * to be added, found or scrolled to, where a normal desktop has the Dock. This
 * puts what is already in the space, the saved web apps, the installed apps and
 * the sites the user keeps going back to into a single list: type, Enter, done.
 */
export const Launcher: React.FC = () => {
  const isOpen = useUiStore((s) => s.isLauncherOpen);
  const space = useSpaceStore((s) => s.spaces[s.activeSpaceId]);
  const webApps = useWebAppStore((s) => s.apps);
  const siteRecords = useSiteVisitStore((s) => s.sites);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  // The catalogue is a Spotlight query, so it is fetched once the launcher is
  // actually opened rather than on every app start.
  const [installedApps, setInstalledApps] = useState<AppData[] | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Opening starts from a clean slate — a launcher that comes back holding the
  // last search is one more thing to clear before typing.
  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setActive(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || installedApps || !window.apps) return;
    void window.apps.list().then((catalog) => setInstalledApps(catalog.apps));
  }, [isOpen, installedApps]);

  const sites = useMemo(() => ranked(siteRecords), [siteRecords]);
  const sections = useMemo(
    () => buildLauncherSections({ space, webApps, sites, installedApps }, query),
    [space, webApps, sites, installedApps, query]
  );
  const flat = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  // A shrinking list must not leave the highlight past its end.
  const index = Math.min(active, Math.max(0, flat.length - 1));

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [index, sections]);

  if (!isOpen) return null;

  const run = (item: LauncherItem | undefined) => {
    if (!item) return;
    useUiStore.getState().closeLauncher();
    item.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Functional, so two presses in one tick move two rows and not one.
      setActive((current) => Math.min(current + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(flat[index]);
    }
  };

  let row = -1;

  return (
    <>
      <div
        className="fixed inset-0 z-[97] bg-black/30 backdrop-blur-[2px]"
        onClick={() => useUiStore.getState().closeLauncher()}
      />
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.12 }}
        className="glass-panel fixed left-1/2 top-[16vh] z-[98] w-[560px] max-w-[92vw] -translate-x-1/2 overflow-hidden rounded-2xl shadow-2xl"
      >
        <div className="border-hair flex items-center gap-2.5 px-4 h-12 border-b">
          <Search size={15} className="t-faint shrink-0" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Go to a tool, or open a new one"
            autoFocus
            className="field flex-1 min-w-0 !bg-transparent outline-none text-sm"
          />
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto p-2">
          {flat.length === 0 ? (
            <div className="t-faint px-2 py-6 text-center text-xs">Nothing matches.</div>
          ) : (
            sections.map((section) => (
              <div key={section.title} className="mb-1.5 last:mb-0">
                <div className="t-faint px-2 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-widest">
                  {section.title}
                </div>
                {section.items.map((item) => {
                  row += 1;
                  const isActive = row === index;
                  return (
                    <button
                      key={item.key}
                      data-active={isActive}
                      onMouseMove={captureRow(setActive, row)}
                      onClick={() => run(item)}
                      className={`!text-[inherit] w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left ${
                        isActive ? 'chrome-button-on' : 'row'
                      }`}
                    >
                      <Mark mark={item.mark} />
                      <span className="flex-1 min-w-0 text-sm truncate">{item.name}</span>
                      {item.hint && (
                        <span className="t-faint text-[10px] truncate max-w-[10rem]">
                          {item.hint}
                        </span>
                      )}
                      {isActive && <CornerDownLeft size={12} className="t-faint shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </>
  );
};

/** Hovering moves the highlight, so the mouse and the arrow keys agree. */
function captureRow(setActive: (row: number) => void, row: number) {
  return () => setActive(row);
}
