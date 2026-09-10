import { Music, type LucideIcon } from 'lucide-react';
import { WidgetType } from '../spaces/types';
import { WIDGET_REGISTRY } from '../widgets/registry';

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

export interface PaletteEntry {
  label: string;
  description: string;
  icon: LucideIcon;
  payload: WidgetDragPayload;
}

const widget = (type: WidgetType, description: string): PaletteEntry => ({
  label: WIDGET_REGISTRY[type].label,
  description,
  icon: WIDGET_REGISTRY[type].icon,
  payload: { type },
});

/** The few things a blank place is normally asking to become. */
export const QUICK_ADD_ITEMS: PaletteEntry[] = [
  widget('memo', 'Write an idea'),
  widget('todo', 'Track next steps'),
  widget('browser', 'Open any website'),
  widget('webapp', 'Keep a favourite site here'),
  widget('column', 'Stack related widgets'),
  widget('timer', 'Work for a set time'),
];

export interface PaletteGroup {
  label: string;
  items: PaletteEntry[];
}

/** Less frequent tools stay reachable without making the first choice a catalogue. */
export const MORE_TOOL_GROUPS: PaletteGroup[] = [
  {
    label: 'Capture',
    items: [widget('sketch', 'Draw freely'), widget('photo', 'Pin an image')],
  },
  {
    label: 'Organise',
    items: [widget('calendar', 'See your schedule'), widget('kanban', 'Plan work in stages')],
  },
  {
    label: 'Work',
    items: [
      widget('app', 'Open a Mac app'),
      { label: 'Music', description: 'Play YouTube Music', icon: Music, payload: { type: 'browser', data: { url: MUSIC_URL } } },
    ],
  },
  {
    label: 'Time',
    items: [widget('clock', 'See the time')],
  },
];

/** Everything that can be added as a canvas widget, also shown by the launcher. */
export const PALETTE_ITEMS: PaletteEntry[] = [
  ...QUICK_ADD_ITEMS,
  ...MORE_TOOL_GROUPS.flatMap((group) => group.items),
];
