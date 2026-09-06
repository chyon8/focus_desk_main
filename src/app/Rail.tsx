import React, { useState } from 'react';
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
  Volume2,
} from 'lucide-react';
import { formatDuration } from '../focus/stats';
import { useToday } from '../focus/useToday';
import { assetUrl } from '../spaces/backgrounds';
import { useSpaceStore } from '../stores/spaceStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { RAIL_WIDTH, RAIL_TOP, useUiStore } from '../stores/uiStore';
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
const SpaceTile: React.FC<{ id: string; onOpenMenu: (top: number) => void }> = ({
  id,
  onOpenMenu,
}) => {
  const name = useSpaceStore((s) => s.spaces[id]?.name ?? '');
  const themeId = useSpaceStore((s) => s.spaces[id]?.themeId);
  const background = useSpaceStore((s) => s.spaces[id]?.background);
  const isActive = useSpaceStore((s) => s.activeSpaceId === id);
  const today = useToday();
  const seconds = useSpaceTimeStore((s) => (isActive ? (s.time[id]?.[today] ?? 0) : 0));

  const scene: SceneSpec = background
    ? background.type === 'IMAGE'
      ? { kind: 'image', src: background.value }
      : { kind: 'color', value: background.value }
    : getTheme(themeId).scene;

  return (
    <div className="flex flex-col items-center w-full">
      <button
        /* 이미 서 있는 공간을 다시 누르는 것은 전환이 아니다. 그 자리에서 이름
           바꾸기·삭제·오늘 기록을 연다 — 떠 있는 이름판을 없애면서 그 셋이 갈 곳이
           여기가 됐다. */
        onClick={(e) => {
          if (isActive) onOpenMenu(e.currentTarget.getBoundingClientRect().top);
          else useSpaceStore.getState().setActiveSpace(id);
        }}
        title={isActive ? `${name} - rename, time, delete` : name}
        aria-current={isActive}
        aria-label={name}
        className={`rail-space ${isActive ? 'rail-space-on' : ''}`}
        style={{ ...sceneStyle(scene), backgroundSize: 'cover', backgroundPosition: 'center' }}
      />
      {/* 서 있는 공간에만. 60px 안이라 이름은 잘리고, 전체는 툴팁과 메뉴에 있다. */}
      {isActive && (
        <>
          <span className="t-ink max-w-full mt-1 px-0.5 truncate text-micro font-semibold">
            {name}
          </span>
          <span className="t-faint text-micro font-mono tabular-nums">
            {formatDuration(seconds)}
          </span>
        </>
      )}
    </div>
  );
};

/** An icon button in the rail. */
const RailTool: React.FC<{
  label: string;
  on?: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
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
 * 서 있는 공간에 거는 것들 — 이름 바꾸기, 오늘 기록, 삭제.
 *
 * 레일의 활성 타일을 다시 누르면 그 타일 옆에 뜬다. 예전에는 화면 왼쪽 위에 판이
 * 상시로 떠 있었는데, 낱말 하나를 위해 레일·독 말고 세 번째 물체가 늘 화면에
 * 있는 꼴이었다. 이름 자체는 레일 안 타일 밑에 있다.
 */
const SpaceMenu: React.FC<{ top: number; onClose: () => void; onOpenInsights: () => void }> = ({
  top,
  onClose,
  onOpenInsights,
}) => {
  const id = useSpaceStore((s) => s.activeSpaceId);
  const name = useSpaceStore((s) => s.spaces[id]?.name ?? '');
  const spaceCount = useSpaceStore(useShallow((s) => Object.keys(s.spaces))).length;
  const today = useToday();
  const seconds = useSpaceTimeStore((s) => s.time[id]?.[today] ?? 0);
  const [draft, setDraft] = useState(name);
  const [isConfirming, setIsConfirming] = useState(false);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== name) useSpaceStore.getState().renameSpace(id, next);
  };

  return (
    <>
      <div className="fixed inset-0 z-[59]" onClick={onClose} />
      <div
        className="glass-panel fixed z-[60] w-60 p-2 rounded-surface"
        style={{ left: RAIL_WIDTH, top }}
      >
        <label htmlFor="space-name" className="t-soft block px-1 pt-1 pb-1.5 text-micro font-semibold uppercase tracking-[0.14em]">
          Space name
        </label>
        <input
          id="space-name"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (isComposing(e)) return;
            if (e.key === 'Enter') {
              commit();
              onClose();
            }
            if (e.key === 'Escape') onClose();
          }}
          className="field w-full mb-1 text-ui font-semibold"
        />

        <button
          onClick={() => {
            onOpenInsights();
            onClose();
          }}
          className="row w-full flex items-center gap-2 px-2 py-2 rounded-control text-ui"
        >
          <span className="t-ink flex-1 text-left">Time here today</span>
          <span className="t-soft text-micro font-mono tabular-nums">
            {formatDuration(seconds)}
          </span>
        </button>

        {spaceCount > 1 &&
          (isConfirming ? (
            <div className="mt-1">
              <p className="t-ink px-2 pb-2 text-meta leading-snug">
                Delete “{name}”? Its widgets, its logged time and its logins go with it.
              </p>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setIsConfirming(false)}
                  className="row flex-1 py-1 rounded-control text-meta"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClose();
                    useSpaceStore.getState().removeSpace(id);
                  }}
                  className="chrome-button flex-1 py-1 rounded-control text-meta font-medium hover:!text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirming(true)}
              className="row w-full flex items-center gap-2 px-2 py-2 rounded-control text-ui hover:!text-red-300"
            >
              <Trash2 size={14} />
              <span className="flex-1 text-left">Delete this space</span>
            </button>
          ))}
      </div>
    </>
  );
};

/**
 * The shell's left edge: every space as a picture, then the few things that act
 * on the space you are in. It floats clear of the window on all four sides so
 * the backdrop reaches the edges of the screen.
 */
export const Rail: React.FC<{ onOpenInsights: () => void }> = ({ onOpenInsights }) => {
  const isOpen = useUiStore((s) => s.isSidebarOpen);
  const isMaximized = useUiStore((s) => s.maximizedWidgetId !== null);
  const isAtmosphereOpen = useUiStore((s) => s.openDock === 'atmosphere');
  const isSoundOpen = useUiStore((s) => s.openDock === 'sound');
  // 소리가 나고 있으면 버튼이 액센트를 쓴다. 불리언이라 페이더를 움직여도 레일이
  // 프레임마다 다시 그려지지 않는다.
  const isAmbiencePlaying = useSpaceStore((s) => {
    const a = s.spaces[s.activeSpaceId]?.ambience;
    return !!a && a.rain + a.fire + a.cafe > 0;
  });
  const spaceIds = useSpaceStore(useShallow((s) => Object.keys(s.spaces)));
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isAppsOpen, setIsAppsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
            style={{ top: RAIL_TOP }}
            className="glass-panel chrome-button fixed left-3.5 z-50 p-2.5 rounded-control"
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
            style={{ top: RAIL_TOP }}
            className="glass-panel fixed left-3.5 bottom-3.5 z-50 flex flex-col items-center gap-2 w-[60px] pt-2.5 pb-2.5 rounded-surface"
          >
            <div className="flex flex-col items-center gap-2 w-full min-h-0 overflow-y-auto no-scrollbar">
              {spaceIds.map((id) => (
                <SpaceTile key={id} id={id} onOpenMenu={setMenuTop} />
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
              label="Background"
              on={isAtmosphereOpen}
              onClick={() => useUiStore.getState().toggleDock('atmosphere')}
            >
              <Image size={18} />
            </RailTool>
            <RailTool
              label="Sound"
              on={isSoundOpen}
              onClick={(e) =>
                useUiStore
                  .getState()
                  .toggleDock('sound', e.currentTarget.getBoundingClientRect().top)
              }
            >
              <Volume2 size={18} style={isAmbiencePlaying ? { color: 'var(--accent)' } : undefined} />
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

      {isOpen && !isMaximized && menuTop !== null && (
        <SpaceMenu
          top={menuTop}
          onClose={() => setMenuTop(null)}
          onOpenInsights={onOpenInsights}
        />
      )}

      {isCreating && (
        <div
          className="glass-panel fixed z-[60] w-64 p-3 rounded-surface"
          style={{ left: RAIL_WIDTH, top: RAIL_TOP }}
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
