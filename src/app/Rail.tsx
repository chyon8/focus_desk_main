import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  Image,
  LayoutGrid,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { formatDuration } from '../focus/stats';
import { useToday } from '../focus/useToday';
import { assetUrl } from '../spaces/backgrounds';
import { useSpaceStore } from '../stores/spaceStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { RAIL_WIDTH, RAIL_INSET, useUiStore } from '../stores/uiStore';
import { useWebAppStore } from '../stores/webappStore';
import { getTheme } from '../themes/themes';
import type { SceneSpec } from '../themes/types';
import { WebAppMark } from '../webapps/WebAppMark';
import { isComposing } from './ime';
import { ChromeImportPanel } from './ChromeImportPanel';
import { CanvasTools } from './Dock';
import { openWebApp } from './launcherItems';
import { SettingsPanel } from './SettingsPanel';
import { SpaceSessionPanel } from './SpaceSessionPanel';
import { WIDGET_DRAG_TYPE, WidgetDragPayload } from './WidgetPalette';

/** More than this is a list, and the launcher (K) is the list. */
const MAX_APPS = 12;

function sceneStyle(scene: SceneSpec): React.CSSProperties {
  switch (scene.kind) {
    case 'image':
      return { backgroundImage: `url(${assetUrl(scene.src)})` };
    case 'gradient':
      return { backgroundImage: scene.value };
    case 'color':
      return { backgroundColor: scene.value };
  }
}

/**
 * A space, drawn as a miniature of its own backdrop.
 *
 * The rail is the one thing on screen at all times, so it carries the product's
 * first axis and nothing else: which space you are in. A picture says that
 * faster than a name, and the same picture is what fills the screen after the
 * click, so the button and its result match.
 */
const SpaceTile: React.FC<{ id: string }> = ({ id }) => {
  const name = useSpaceStore((s) => s.spaces[id]?.name ?? '');
  const themeId = useSpaceStore((s) => s.spaces[id]?.themeId);
  const background = useSpaceStore((s) => s.spaces[id]?.background);
  const isActive = useSpaceStore((s) => s.activeSpaceId === id);

  const scene: SceneSpec = background
    ? background.type === 'IMAGE'
      ? { kind: 'image', src: background.value }
      : { kind: 'color', value: background.value }
    : getTheme(themeId).scene;

  return (
    <button
      onClick={() => useSpaceStore.getState().setActiveSpace(id)}
      title={name}
      aria-current={isActive}
      aria-label={name}
      className={`rail-space ${isActive ? 'rail-space-on' : ''}`}
      style={{ ...sceneStyle(scene), backgroundSize: 'cover', backgroundPosition: 'center' }}
    />
  );
};

/** An icon button in the rail. */
const RailTool: React.FC<{
  label: string;
  on?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, on, onClick, children }) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    aria-pressed={on}
    className={`rail-tool ${on ? 'rail-tool-on' : ''}`}
  >
    {children}
  </button>
);

/** The saved web apps. A click opens one here; a drag drops it where it lands. */
const WebApps: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const apps = useWebAppStore((s) => s.apps);
  const list = Object.values(apps)
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, MAX_APPS);

  return (
    <>
      <div className="fixed inset-0 z-[89]" onClick={onDone} />
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        className="glass-panel absolute left-full top-0 ml-3 z-[90] w-56 p-2 rounded-surface"
      >
        <div className="t-soft px-2 pt-1 pb-2 text-micro font-semibold uppercase tracking-[0.14em]">
          Web apps
        </div>
        {list.length === 0 ? (
          <p className="t-soft px-2 pb-2 text-meta leading-snug">
            No web apps yet. Add one from a browser widget's address bar.
          </p>
        ) : (
          <div className="grid grid-cols-4 gap-1">
            {list.map((app) => (
              <button
                key={app.id}
                title={`${app.name} - click to open, or drag onto the canvas`}
                draggable
                onDragStart={(e) => {
                  const payload: WidgetDragPayload = {
                    type: 'webapp',
                    data: {
                      appId: app.id,
                      name: app.name,
                      icon: app.icon,
                      homeUrl: app.url,
                      url: app.url,
                      open: true,
                    },
                  };
                  e.dataTransfer.setData(WIDGET_DRAG_TYPE, JSON.stringify(payload));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => {
                  openWebApp(app);
                  onDone();
                }}
                className="row flex flex-col items-center justify-center gap-1 py-2 rounded-control active:scale-95"
              >
                <WebAppMark icon={app.icon} name={app.name} size={18} />
                <span className="text-micro leading-none tracking-wide truncate max-w-full">
                  {app.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );
};

/**
 * The name of the space you are in, and how long you have been in it today.
 *
 * It is its own floating plate rather than a heading inside the rail: the rail
 * is 60px of pictures, and a name long enough to be worth reading does not fit
 * in it. Double-clicking renames in place, which is where renaming lived when
 * the rail was a list of rows.
 */
const SpaceName: React.FC<{ shown: boolean; onOpenInsights: () => void }> = ({
  shown,
  onOpenInsights,
}) => {
  const id = useSpaceStore((s) => s.activeSpaceId);
  const name = useSpaceStore((s) => s.spaces[id]?.name ?? '');
  const spaceCount = useSpaceStore(useShallow((s) => Object.keys(s.spaces))).length;
  const today = useToday();
  const seconds = useSpaceTimeStore((s) => s.time[id]?.[today] ?? 0);
  const [mode, setMode] = useState<'view' | 'rename' | 'confirm'>('view');
  const [draft, setDraft] = useState(name);

  if (mode === 'confirm') {
    return (
      <div
        className="glass-panel fixed z-50 w-64 p-3 rounded-surface"
        style={{ left: RAIL_WIDTH, top: RAIL_INSET }}
      >
        <p className="t-ink text-meta leading-snug mb-2">
          Delete “{name}”? Its widgets, its logged time and its logins go with it.
        </p>
        <div className="flex gap-1.5">
          <button onClick={() => setMode('view')} className="row flex-1 py-1 rounded-control text-meta">
            Cancel
          </button>
          <button
            onClick={() => {
              setMode('view');
              useSpaceStore.getState().removeSpace(id);
            }}
            className="chrome-button flex-1 py-1 rounded-control text-meta font-medium hover:!text-red-300"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  // 이름을 읽고 있을 때(rename) 사라지면 안 된다.
  const visible = shown || mode === 'rename';

  return (
    <div
      className="glass-panel group fixed z-50 flex items-center gap-2 h-9 pl-3 pr-1.5 rounded-control transition-opacity duration-200"
      style={{
        left: RAIL_WIDTH,
        top: RAIL_INSET,
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      onDoubleClick={() => {
        setDraft(name);
        setMode('rename');
      }}
    >
      {mode === 'rename' ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            useSpaceStore.getState().renameSpace(id, draft);
            setMode('view');
          }}
          onKeyDown={(e) => {
            if (isComposing(e)) return;
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') setMode('view');
          }}
          className="field !bg-transparent w-40 text-ui font-semibold outline-none"
        />
      ) : (
        <span className="t-ink max-w-56 truncate text-ui font-semibold" title="Double-click to rename">
          {name}
        </span>
      )}

      <button
        onClick={onOpenInsights}
        title="Time here today - open focus insights"
        className="chrome-button t-soft px-1.5 h-6 flex items-center rounded-mark text-micro font-mono tabular-nums"
      >
        {formatDuration(seconds)}
      </button>

      {spaceCount > 1 && mode === 'view' && (
        <button
          onClick={() => setMode('confirm')}
          title="Delete this space"
          className="t-soft opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-mark transition-opacity hover:!text-red-300"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
};

/**
 * The shell's left edge: every space as a picture, then the few things that act
 * on the space you are in. It floats clear of the window on all four sides so
 * the backdrop reaches the edges of the screen.
 */
export const Rail: React.FC<{ onOpenInsights: () => void }> = ({ onOpenInsights }) => {
  const isOpen = useUiStore((s) => s.isSidebarOpen);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);
  // 이름판은 상시 UI가 아니다. 레일에 손이 갔을 때, 그리고 공간을 막 바꿨을 때만
  // 뜬다 — 활성 타일과 화면을 채운 배경이 이미 어느 공간인지 말하고 있다.
  const [isHovering, setIsHovering] = useState(false);
  const [justSwitched, setJustSwitched] = useState(false);
  const isMaximized = useUiStore((s) => s.maximizedWidgetId !== null);
  const isAtmosphereOpen = useUiStore((s) => s.openDock === 'theme');
  const spaceIds = useSpaceStore(useShallow((s) => Object.keys(s.spaces)));
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    setJustSwitched(true);
    const timer = setTimeout(() => setJustSwitched(false), 1800);
    return () => clearTimeout(timer);
  }, [activeSpaceId]);

  const create = () => {
    if (!newName.trim()) return;
    useSpaceStore.getState().addSpace(newName);
    setNewName('');
    setIsCreating(false);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && !isMaximized && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => useUiStore.getState().setSidebarOpen(true)}
            title="Spaces"
            /* 신호등이 창 왼쪽 위를 쓰므로 그 아래에 선다. 겹치면 둘 다 못 누른다. */
            className="glass-panel chrome-button fixed left-3.5 top-14 z-50 p-2.5 rounded-control"
          >
            <LayoutGrid size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            aria-label="Spaces and tools"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="glass-panel fixed left-3.5 top-3.5 bottom-3.5 z-50 flex flex-col items-center gap-2 w-[60px] pt-11 pb-2.5 rounded-surface"
          >
            <div className="flex flex-col items-center gap-2 w-full min-h-0 overflow-y-auto no-scrollbar">
              {spaceIds.map((id) => (
                <SpaceTile key={id} id={id} />
              ))}
            </div>

            <button
              onClick={() => setIsCreating(true)}
              title="New space"
              aria-label="New space"
              className="rail-add"
            >
              <Plus size={16} />
            </button>

            <div className="rail-sep" />

            <RailTool label="Search this space (K)" onClick={useUiStore.getState().toggleLauncher}>
              <Search size={18} />
            </RailTool>
            <div className="relative">
              <RailTool label="Web apps" on={isAppsOpen} onClick={() => setIsAppsOpen((o) => !o)}>
                <LayoutGrid size={18} />
              </RailTool>
              <AnimatePresence>
                {isAppsOpen && <WebApps onDone={() => setIsAppsOpen(false)} />}
              </AnimatePresence>
            </div>

            <div className="flex-1" />
            <div className="rail-sep" />

            <CanvasTools />

            <div className="rail-sep" />

            <RailTool
              label="Atmosphere - background and sound"
              on={isAtmosphereOpen}
              onClick={() => useUiStore.getState().toggleDock('theme')}
            >
              <Image size={18} />
            </RailTool>
            <RailTool
              label="Settings"
              on={isSettingsOpen}
              onClick={() => setIsSettingsOpen((o) => !o)}
            >
              <SlidersHorizontal size={18} />
            </RailTool>
            <RailTool label="Hide the rail" onClick={() => useUiStore.getState().setSidebarOpen(false)}>
              <ChevronLeft size={18} />
            </RailTool>
          </motion.aside>
        )}
      </AnimatePresence>

      {isOpen && !isMaximized && (
        <SpaceName shown={isHovering || justSwitched} onOpenInsights={onOpenInsights} />
      )}

      {isCreating && (
        <div
          className="glass-panel fixed z-[60] w-64 p-3 rounded-surface"
          style={{ left: RAIL_WIDTH, top: RAIL_INSET }}
        >
          <label htmlFor="new-space-name" className="t-soft block mb-1.5 text-micro font-semibold uppercase tracking-[0.14em]">
            Space name
          </label>
          <input
            id="new-space-name"
            autoFocus
            className="field w-full px-2 h-8 rounded-control text-ui outline-none"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (isComposing(e)) return;
              if (e.key === 'Enter') create();
              if (e.key === 'Escape') setIsCreating(false);
            }}
          />
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => setIsCreating(false)}
              className="row flex-1 py-1.5 rounded-control text-meta"
            >
              Cancel
            </button>
            <button onClick={create} className="btn-primary flex-1 py-1.5 rounded-control text-meta">
              Create
            </button>
          </div>
        </div>
      )}

      {isImportOpen && <ChromeImportPanel onClose={() => setIsImportOpen(false)} />}
      {isSessionOpen && <SpaceSessionPanel onClose={() => setIsSessionOpen(false)} />}
      {isSettingsOpen && (
        <SettingsPanel
          onClose={() => setIsSettingsOpen(false)}
          onOpenImport={() => {
            setIsSettingsOpen(false);
            setIsImportOpen(true);
          }}
          onOpenSessions={() => {
            setIsSettingsOpen(false);
            setIsSessionOpen(true);
          }}
        />
      )}
    </>
  );
};
