import React from 'react';
import { Music } from 'lucide-react';
import { WidgetType } from '../spaces/types';
import { useSpaceStore } from '../stores/spaceStore';
import { WIDGET_REGISTRY, WIDGET_TYPES } from '../widgets/registry';

/** What a dragged palette icon carries. Read on drop by the canvas. */
export const WIDGET_DRAG_TYPE = 'application/x-focus-desk-widget';

export interface WidgetDragPayload {
  type: WidgetType;
  data?: Record<string, unknown>;
}

// A site the browser widget opens straight into. Not a widget type of its own:
// a native view loads music.youtube.com just fine, and everything a dedicated
// widget would add (its own address bar, nav buttons) already exists.
const MUSIC_URL = 'https://music.youtube.com';

const PaletteItem: React.FC<{
  label: string;
  payload: WidgetDragPayload;
  children: React.ReactNode;
}> = ({ label, payload, children }) => (
  <button
    title={`${label} — click to add, or drag onto the canvas`}
    draggable
    onDragStart={(e) => {
      e.dataTransfer.setData(WIDGET_DRAG_TYPE, JSON.stringify(payload));
      e.dataTransfer.effectAllowed = 'copy';
    }}
    onClick={() => useSpaceStore.getState().addWidget(payload.type, payload.data)}
    className="row flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg active:scale-95"
  >
    {children}
    <span className="text-[9px] leading-none tracking-wide">{label}</span>
  </button>
);

/**
 * The widget drawer, living in the sidebar next to the spaces.
 *
 * Click drops a widget in the middle of the view; dragging one onto the canvas
 * leaves it where it was let go. This is the only way to add a widget — the
 * control bar no longer carries a row of them (D-056).
 */
export const WidgetPalette: React.FC = () => (
  <div className="border-hair shrink-0 mt-3 pt-3 border-t">
    <div className="px-3 mb-2">
      <span className="t-faint text-[10px] font-bold uppercase tracking-widest">Widgets</span>
    </div>

    <div className="grid grid-cols-4 gap-1 px-1">
      {WIDGET_TYPES.map((type) => {
        const entry = WIDGET_REGISTRY[type];
        return (
          <PaletteItem key={type} label={entry.label} payload={{ type }}>
            <entry.icon size={18} />
          </PaletteItem>
        );
      })}

      <PaletteItem label="Music" payload={{ type: 'browser', data: { url: MUSIC_URL } }}>
        <Music size={18} />
      </PaletteItem>
    </div>
  </div>
);
