import { WidgetType } from '../spaces/types';

// Data-only widget definitions. Kept free of React imports so the space store can
// use them without pulling in components (which import the store back).
export interface WidgetDef {
  label: string;
  defaultSize: { width: number; height: number };
  /**
   * How many times its default size a stack arrange may draw this widget. A photo
   * or a page reads better the bigger it is drawn; a clock face, a timer and a
   * calendar do not — past their designed size they are only bigger, and letting
   * them fill a lane is what made a stack look like a wall of equal cards.
   * Omitted means the arrange's own ceiling (half again).
   */
  arrangeGrow?: number;
  createData: () => Record<string, unknown>;
}

export const WIDGET_DEFS: Record<WidgetType, WidgetDef> = {
  todo: {
    label: 'Todo',
    defaultSize: { width: 320, height: 420 },
    arrangeGrow: 1.2,
    createData: () => ({ items: [], theme: 'LIGHT' }),
  },
  memo: {
    label: 'Memo',
    // A document, not a scrap: a three-column table at 360 wide is unreadable.
    defaultSize: { width: 420, height: 460 },
    createData: () => ({ content: '', theme: 'LIGHT' }),
  },
  timer: {
    label: 'Timer',
    defaultSize: { width: 340, height: 340 },
    arrangeGrow: 1,
    createData: () => ({ duration: 25 * 60, timeLeft: 25 * 60, isRunning: false, mode: 'FOCUS' }),
  },
  clock: {
    label: 'Clock',
    defaultSize: { width: 320, height: 400 },
    arrangeGrow: 1,
    createData: () => ({ theme: 'LIGHT' }),
  },
  kanban: {
    label: 'Kanban',
    defaultSize: { width: 560, height: 420 },
    createData: () => ({ columns: { todo: [], doing: [], done: [] }, theme: 'LIGHT' }),
  },
  browser: {
    label: 'Browser',
    defaultSize: { width: 900, height: 620 },
    // No address: a new widget shows the start page — saved web apps and the
    // sites actually visited — rather than loading a placeholder nobody wants
    // to read (D-075).
    createData: () => ({ url: '' }),
  },
  calendar: {
    label: 'Calendar',
    defaultSize: { width: 340, height: 360 },
    arrangeGrow: 1,
    createData: () => ({ theme: 'LIGHT' }),
  },
  photo: {
    label: 'Photo',
    defaultSize: { width: 280, height: 320 },
    // The one widget worth blowing up: a photo is the picture, not a frame round it.
    arrangeGrow: 2.5,
    createData: () => ({ url: '', caption: '' }),
  },
  sketch: {
    label: 'Sketch',
    defaultSize: { width: 520, height: 420 },
    createData: () => ({ strokes: [] }),
  },
  app: {
    label: 'App',
    defaultSize: { width: 280, height: 320 },
    arrangeGrow: 1,
    createData: () => ({ appKey: '', name: '', icon: null }),
  },
  column: {
    label: 'Column',
    // Every column is this wide — `COLUMN_WIDTH`. The height is never this: a
    // column is always as tall as the cards it holds.
    defaultSize: { width: 300, height: 136 },
    createData: () => ({ title: '', children: [] }),
  },
  webapp: {
    label: 'Favorite',
    // A page, so it needs page room — narrower than the browser widget, but the
    // same height: at 440 the picker showed three or four suggestions at a time,
    // and a web app page had barely a screenful. Not taller than the browser
    // widget, since a default taller than the canvas gets centred with its own
    // header above the top of the screen, out of reach.
    defaultSize: { width: 560, height: 620 },
    createData: () => ({ appId: '', name: '', url: '', homeUrl: '', icon: null, open: false }),
  },
};
