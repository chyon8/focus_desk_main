import React, { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  Ellipsis,
  Image,
  KeyRound,
  LayoutGrid,
  Plus,
  Search,
  Trash2,
  Volume2,
} from 'lucide-react';
import { formatDuration } from '../focus/stats';
import { useToday } from '../focus/useToday';
import { assetUrl } from '../spaces/backgrounds';
import { useSpaceStore } from '../stores/spaceStore';
import { useSpaceTimeStore } from '../stores/spaceTimeStore';
import { RAIL_WIDTH, RAIL_TOP, useUiStore } from '../stores/uiStore';
import { getTheme } from '../themes/themes';
import type { SceneSpec } from '../themes/types';
import { isComposing } from './ime';
import { ChromeImportPanel } from './ChromeImportPanel';
import { ArrangeTools, CanvasTools } from './Dock';
import { SettingsPanel } from './SettingsPanel';
import { SignInsPanel } from './SignInsPanel';

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
const SpaceTile: React.FC<{
  id: string;
  isMenuOpen: boolean;
  onOpenMenu: (id: string, top: number) => void;
}> = ({ id, isMenuOpen, onOpenMenu }) => {
  const name = useSpaceStore((s) => s.spaces[id]?.name ?? '');
  const themeId = useSpaceStore((s) => s.spaces[id]?.themeId);
  const background = useSpaceStore((s) => s.spaces[id]?.background);
  const isActive = useSpaceStore((s) => s.activeSpaceId === id);
  const today = useToday();
  const seconds = useSpaceTimeStore((s) => (isActive ? (s.time[id]?.[today] ?? 0) : 0));
  const [draft, setDraft] = useState<string | null>(null);

  const scene: SceneSpec = background
    ? background.type === 'IMAGE'
      ? { kind: 'image', src: background.value }
      : { kind: 'color', value: background.value }
    : getTheme(themeId).scene;

  const commitName = () => {
    if (draft !== null) useSpaceStore.getState().renameSpace(id, draft);
    setDraft(null);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* 메뉴는 우클릭과 모서리 … 버튼으로 연다. 지금 공간을 한 번 더 누르면 열리던
          방식은 뺐다(2026-09-17) — 보이는 표시가 없었고, 다른 공간의 이름을 바꾸거나
          지우려면 그 공간으로 먼저 옮겨가야 했다. 누르기는 이동만 한다. */}
      <div
        className="rail-space-wrap relative"
        onContextMenu={(e) => {
          e.preventDefault();
          onOpenMenu(id, e.currentTarget.getBoundingClientRect().top);
        }}
      >
        <button
          onClick={() => {
            if (!isActive) useSpaceStore.getState().setActiveSpace(id);
          }}
          title={name}
          aria-current={isActive}
          aria-label={name}
          className={`rail-space ${isActive ? 'rail-space-on' : ''}`}
          style={{ ...sceneStyle(scene), backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
        <button
          onClick={(e) =>
            onOpenMenu(id, (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect().top)
          }
          title={`${name} - rename, sign-ins, delete`}
          aria-label={`${name} options`}
          className={`rail-space-more ${isMenuOpen ? 'rail-space-more-on' : ''}`}
        >
          <Ellipsis size={11} />
        </button>
      </div>
      {/* 서 있는 공간에만. 60px 안이라 이름은 잘리고, 전체는 툴팁과 메뉴에 있다.
          더블클릭하면 그 자리에서 고친다. */}
      {isActive && (
        <>
          {draft !== null ? (
            <input
              autoFocus
              aria-label="Space name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitName}
              onFocus={(e) => e.currentTarget.select()}
              onKeyDown={(e) => {
                if (isComposing(e)) return;
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') setDraft(null);
              }}
              className="field w-[52px] mt-1 px-0.5 text-center text-micro font-semibold"
            />
          ) : (
            <span
              onDoubleClick={() => setDraft(name)}
              title="Double-click to rename"
              className="t-ink max-w-full mt-1 px-0.5 truncate text-micro font-semibold cursor-default select-none"
            >
              {name}
            </span>
          )}
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

/**
 * 공간 하나에 거는 것들 — 이름 바꾸기, 오늘 기록, 로그인 방식, 삭제.
 *
 * 레일의 어느 공간 타일에서든 우클릭이나 모서리 … 버튼으로 연다. 그 공간으로
 * 옮겨가지 않는다. 로그인 목록은 앱 전체의 것이라 설정(More)에 있고, 여기에는
 * 이 공간이 공유 로그인을 쓸지 자기 것을 쓸지만 있다.
 */
const SpaceMenu: React.FC<{
  id: string;
  top: number;
  onClose: () => void;
  onOpenInsights: () => void;
}> = ({ id, top, onClose, onOpenInsights }) => {
  const name = useSpaceStore((s) => s.spaces[id]?.name ?? '');
  const separate = useSpaceStore((s) => s.spaces[id]?.signIns === 'separate');
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
      <div className="fixed inset-0 z-[59]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
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

        <button
          role="switch"
          aria-checked={separate}
          onClick={() => useSpaceStore.getState().setSignIns(id, separate ? 'shared' : 'separate')}
          title={
            separate
              ? 'This space has sign-ins of its own. Turn off to use the shared ones; these are kept.'
              : 'This space uses the shared sign-ins. Turn on to give it its own.'
          }
          className="row w-full flex items-center gap-2 px-2 py-2 rounded-control text-ui"
        >
          <KeyRound size={14} />
          <span className="t-ink flex-1 text-left">Separate sign-ins</span>
          <span className={`switch ${separate ? 'switch-on' : ''}`} aria-hidden />
        </button>
        <p className="t-faint px-2 pb-1.5 text-micro leading-snug">
          {separate ? 'Own sign-ins. ' : 'Shared with other spaces. '}Pages here reload when this
          changes.
        </p>

        {spaceCount > 1 &&
          (isConfirming ? (
            <div className="mt-1">
              <p className="t-ink px-2 pb-2 text-meta leading-snug">
                {separate
                  ? `Delete “${name}”? Its widgets, its logged time and its logins go with it.`
                  : `Delete “${name}”? Its widgets and its logged time go with it. The shared sign-ins stay.`}
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
                  className="chrome-button flex-1 py-1 rounded-control text-meta font-medium t-danger"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsConfirming(true)}
              className="row w-full flex items-center gap-2 px-2 py-2 rounded-control text-ui t-danger"
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
  const [menu, setMenu] = useState<{ id: string; top: number } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isSignInsOpen, setIsSignInsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

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
                <SpaceTile
                  key={id}
                  id={id}
                  isMenuOpen={menu?.id === id}
                  onOpenMenu={(spaceId, top) => setMenu({ id: spaceId, top })}
                />
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

            <div className="flex-1" />
            <div className="rail-sep" />

            <ArrangeTools />
            <CanvasTools />

            <div className="rail-sep" />

            <RailTool
              label="Space appearance"
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
              label="More"
              on={isMoreOpen}
              onClick={() => setIsMoreOpen((o) => !o)}
            >
              <Ellipsis size={18} />
            </RailTool>
            <RailTool label="Hide the rail" onClick={() => useUiStore.getState().setSidebarOpen(false)}>
              <ChevronLeft size={18} />
            </RailTool>
          </motion.aside>
        )}
      </AnimatePresence>

      {isOpen && !isMaximized && menu && (
        <SpaceMenu
          key={menu.id}
          id={menu.id}
          top={menu.top}
          onClose={() => setMenu(null)}
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
          <div className="border-hair mt-3 pt-3 border-t">
            <button
              onClick={() => {
                setIsCreating(false);
                setIsImportOpen(true);
              }}
              className="row w-full flex items-center gap-2 px-2 py-2 rounded-control text-ui"
            >
              Bring in from Chrome
            </button>
          </div>
        </div>
      )}

      {isImportOpen && <ChromeImportPanel onClose={() => setIsImportOpen(false)} />}
      {isSignInsOpen && <SignInsPanel onClose={() => setIsSignInsOpen(false)} />}
      {isMoreOpen && (
        <SettingsPanel
          onClose={() => setIsMoreOpen(false)}
          onOpenSignIns={() => {
            setIsMoreOpen(false);
            setIsSignInsOpen(true);
          }}
        />
      )}
    </>
  );
};
