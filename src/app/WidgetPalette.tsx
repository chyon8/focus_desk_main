import React from 'react';
import { Music, Table, Workflow, type LucideIcon } from 'lucide-react';
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

// A table and a diagram are blocks in a note, not widget types of their own
// (D-080) — the canvas is already what holds separate objects side by side. They
// are here because reaching for one is reaching for a tool, so the palette hands
// over a note with that block already in it.
const TABLE_NOTE =
  '<table><tbody><tr><th><p></p></th><th><p></p></th><th><p></p></th></tr>' +
  '<tr><td><p></p></td><td><p></p></td><td><p></p></td></tr>' +
  '<tr><td><p></p></td><td><p></p></td><td><p></p></td></tr></tbody></table><p></p>';
const DIAGRAM_NOTE =
  '<div data-mermaid data-code="flowchart TD&#10;  A[Idea] --&gt; B[Draft]&#10;  B --&gt; C[Done]"></div><p></p>';

export interface PaletteEntry {
  label: string;
  icon: LucideIcon;
  payload: WidgetDragPayload;
}

/** Everything that can be added, in one list — the sidebar and the quick-add
 *  popover (D-063) show the same set, so they can never drift apart. */
export const PALETTE_ITEMS: PaletteEntry[] = [
  ...WIDGET_TYPES.map((type) => ({
    label: WIDGET_REGISTRY[type].label,
    icon: WIDGET_REGISTRY[type].icon,
    payload: { type } as WidgetDragPayload,
  })),
  { label: 'Music', icon: Music, payload: { type: 'browser', data: { url: MUSIC_URL } } },
  {
    label: 'Table',
    icon: Table,
    payload: { type: 'memo', data: { content: TABLE_NOTE, theme: 'LIGHT' } },
  },
  {
    label: 'Diagram',
    icon: Workflow,
    payload: { type: 'memo', data: { content: DIAGRAM_NOTE, theme: 'LIGHT' } },
  },
];

const PaletteItem: React.FC<{ item: PaletteEntry }> = ({ item }) => (
  <button
    title={`${item.label} — click to add, or drag onto the canvas`}
    draggable
    onDragStart={(e) => {
      e.dataTransfer.setData(WIDGET_DRAG_TYPE, JSON.stringify(item.payload));
      e.dataTransfer.effectAllowed = 'copy';
    }}
    onClick={() => useSpaceStore.getState().addWidget(item.payload.type, item.payload.data)}
    className="row flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg active:scale-95"
  >
    <item.icon size={18} />
    <span className="text-[9px] leading-none tracking-wide">{item.label}</span>
  </button>
);

/**
 * The widget drawer, living in the sidebar next to the spaces.
 *
 * Click drops a widget in the middle of the view; dragging one onto the canvas
 * leaves it where it was let go. Double-clicking the canvas opens the same list
 * where the pointer is (D-063), which is the quicker way once you know it.
 */
export const WidgetPalette: React.FC = () => (
  <div className="border-hair shrink-0 mt-3 pt-3 border-t">
    <div className="px-3 mb-2">
      <span className="t-faint text-[10px] font-bold uppercase tracking-widest">Widgets</span>
    </div>

    <div className="grid grid-cols-4 gap-1 px-1">
      {PALETTE_ITEMS.map((item) => (
        <PaletteItem key={item.label} item={item} />
      ))}
    </div>
  </div>
);
