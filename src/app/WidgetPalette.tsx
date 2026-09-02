import { Music, Table, Workflow, type LucideIcon } from 'lucide-react';
import { WidgetType } from '../spaces/types';
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

/** Everything that can be added, in one list — the canvas double-click popover
 *  (D-063) and the launcher (K) show the same set, so they cannot drift apart. */
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

