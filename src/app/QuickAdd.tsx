import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { screenToWorld } from '../canvas/camera';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { PALETTE_ITEMS, PaletteEntry } from './WidgetPalette';

const PANEL_WIDTH = 232;
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
 * and the widget lands exactly there. The sidebar copy stays for browsing — this
 * one exists because crossing the screen to fetch a widget was the slow part (D-063).
 */
export const QuickAdd: React.FC = () => {
  const quickAdd = useUiStore((s) => s.quickAdd);
  const panel = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(PANEL_HEIGHT_GUESS);

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
        <div className="t-faint px-2 pt-1 pb-2 text-micro font-bold uppercase tracking-widest">
          Add widget
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PALETTE_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => add(item)}
              title={item.label}
              className="row flex flex-col items-center justify-center gap-1 py-3 rounded-control"
            >
              <item.icon size={18} />
              <span className="text-micro leading-none tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
};
