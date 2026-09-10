import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { screenToWorld } from '../canvas/camera';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { MORE_TOOL_GROUPS, QUICK_ADD_ITEMS, PaletteEntry } from './WidgetPalette';

const PANEL_WIDTH = 304;
// 첫 렌더에 쓸 어림값. 진짜 높이는 아래에서 재서 덮는다 — 팔레트에 줄이 하나
// 늘 때마다 상수를 같이 고쳐야 했고, 안 고쳐서 마지막 줄이 창 밖으로 잘렸다.
const PANEL_HEIGHT_GUESS = 260;
const EDGE = 12;

/**
 * Opens the quick-add palette in the middle of the canvas — what N does, since a
 * keypress has no pointer to open at.
 */
export function openQuickAddAtCentre() {
  const area = canvasArea();
  // The canvas element starts at the sidebar's edge but at the window's top, so
  // only x is offset when going from window coordinates into the element.
  const local = { x: area.width / 2, y: area.y + area.height / 2 };
  useUiStore
    .getState()
    .openQuickAdd(
      { x: area.x + local.x, y: local.y },
      screenToWorld(getCamera(), local)
    );
}

/**
 * The palette where the pointer already is: double-click bare canvas (or press N)
 * and the widget lands exactly there. This avoids crossing the screen to fetch a
 * widget (D-063).
 */
export const QuickAdd: React.FC = () => {
  const quickAdd = useUiStore((s) => s.quickAdd);
  const panel = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(PANEL_HEIGHT_GUESS);
  const [view, setView] = useState<'quick' | 'more'>('quick');

  // A new opening always starts with the short list, even if the last one was
  // closed while its more-tools list was open.
  useLayoutEffect(() => {
    if (quickAdd) setView('quick');
  }, [quickAdd]);

  // 그려진 높이를 재서 접는 값에 쓴다. 레이아웃 이펙트라 화면에 나오기 전에
  // 자리가 잡히고, 값이 같으면 setState를 안 해서 여기서 멈춘다.
  useLayoutEffect(() => {
    const measured = panel.current?.offsetHeight;
    if (measured && measured !== height) setHeight(measured);
  });

  if (!quickAdd) return null;

  // 접는 순서: 먼저 아래·오른쪽 변에 맞추고, 그래도 넘치면 위·왼쪽 변이 이긴다.
  // 반대로 하면 화면보다 큰 팝오버가 위로 잘려서 첫 줄을 못 누른다.
  const left = Math.max(
    EDGE,
    Math.min(quickAdd.screen.x - PANEL_WIDTH / 2, window.innerWidth - PANEL_WIDTH - EDGE)
  );
  const top = Math.max(
    EDGE,
    Math.min(quickAdd.screen.y - 12, window.innerHeight - height - EDGE)
  );

  const add = (item: PaletteEntry) => {
    useSpaceStore.getState().addWidget(item.payload.type, item.payload.data, quickAdd.world);
    useUiStore.getState().closeQuickAdd();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[95]"
        onPointerDown={() => useUiStore.getState().closeQuickAdd()}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.12 }}
        ref={panel}
        style={{ left, top, width: PANEL_WIDTH, maxHeight: `calc(100vh - ${EDGE * 2}px)` }}
        className="glass-panel fixed z-[96] overflow-y-auto p-2 rounded-surface"
      >
        {view === 'quick' ? (
          <>
            <div className="t-faint px-2 pt-1 pb-2 text-micro font-bold uppercase tracking-widest">
              Add widget
            </div>
            <div className="grid grid-cols-2 gap-1">
              {QUICK_ADD_ITEMS.map((item) => (
                <PaletteCard key={item.label} item={item} onClick={() => add(item)} />
              ))}
            </div>
            <button
              onClick={() => setView('more')}
              className="row mt-1.5 w-full flex items-center gap-2 px-3 py-2 rounded-control text-ui"
            >
              <span className="flex-1 text-left">More tools</span>
              <ChevronRight size={14} className="t-faint" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-1 pt-1 pb-2">
              <button
                onClick={() => setView('quick')}
                title="Back"
                aria-label="Back to quick add"
                className="chrome-button w-7 h-7 flex items-center justify-center rounded-control"
              >
                <ArrowLeft size={14} />
              </button>
              <div className="t-faint text-micro font-bold uppercase tracking-widest">More tools</div>
            </div>
            <div className="space-y-2">
              {MORE_TOOL_GROUPS.map((group) => (
                <section key={group.label}>
                  <div className="t-faint px-2 pb-1 text-micro font-bold uppercase tracking-widest">
                    {group.label}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => (
                      <PaletteRow key={item.label} item={item} onClick={() => add(item)} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </>
  );
};

const PaletteCard: React.FC<{ item: PaletteEntry; onClick: () => void }> = ({ item, onClick }) => {
  const Icon = item.icon;
  return (
    <button onClick={onClick} title={item.label} className="row min-h-20 flex items-start gap-2 p-3 rounded-control text-left">
      <Icon size={17} className="t-soft mt-0.5 shrink-0" />
      <span className="min-w-0">
        <span className="t-ink block text-ui font-medium">{item.label}</span>
        <span className="t-faint mt-0.5 block text-micro leading-snug">{item.description}</span>
      </span>
    </button>
  );
};

const PaletteRow: React.FC<{ item: PaletteEntry; onClick: () => void }> = ({ item, onClick }) => {
  const Icon = item.icon;
  return (
    <button onClick={onClick} className="row w-full flex items-center gap-3 px-2 py-2 rounded-control text-left">
      <Icon size={16} className="t-soft shrink-0" />
      <span className="t-ink text-ui font-medium">{item.label}</span>
      <span className="t-faint ml-auto text-micro">{item.description}</span>
    </button>
  );
};
