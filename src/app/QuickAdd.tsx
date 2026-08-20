import React from 'react';
import { motion } from 'framer-motion';
import { getCamera, useSpaceStore } from '../stores/spaceStore';
import { screenToWorld } from '../canvas/camera';
import { canvasArea, useUiStore } from '../stores/uiStore';
import { PALETTE_ITEMS, PaletteEntry } from './WidgetPalette';

const PANEL_WIDTH = 232;
// Four columns of the palette plus its heading; only used to keep the panel on screen.
const PANEL_HEIGHT = 220;
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
  if (!quickAdd) return null;

  const left = Math.min(
    Math.max(EDGE, quickAdd.screen.x - PANEL_WIDTH / 2),
    window.innerWidth - PANEL_WIDTH - EDGE
  );
  const top = Math.min(
    Math.max(EDGE, quickAdd.screen.y - 12),
    window.innerHeight - PANEL_HEIGHT - EDGE
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
        style={{ left, top, width: PANEL_WIDTH }}
        className="glass-panel fixed z-[96] p-2 rounded-2xl shadow-2xl"
      >
        <div className="t-faint px-2 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest">
          Add widget
        </div>
        <div className="grid grid-cols-4 gap-1">
          {PALETTE_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => add(item)}
              title={item.label}
              className="row flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg active:scale-95"
            >
              <item.icon size={18} />
              <span className="text-[9px] leading-none tracking-wide">{item.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </>
  );
};
