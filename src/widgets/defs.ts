import { WidgetType } from '../spaces/types';

// Data-only widget definitions. Kept free of React imports so the space store can
// use them without pulling in components (which import the store back).
export interface WidgetDef {
  label: string;
  defaultSize: { width: number; height: number };
  createData: () => Record<string, unknown>;
}

export const WIDGET_DEFS: Record<WidgetType, WidgetDef> = {
  todo: {
    label: 'Todo',
    defaultSize: { width: 320, height: 420 },
    createData: () => ({ items: [], theme: 'LIGHT' }),
  },
  memo: {
    label: 'Memo',
    defaultSize: { width: 360, height: 400 },
    createData: () => ({ content: '', theme: 'LIGHT' }),
  },
  timer: {
    label: 'Timer',
    defaultSize: { width: 340, height: 340 },
    createData: () => ({ duration: 25 * 60, timeLeft: 25 * 60, isRunning: false, mode: 'FOCUS' }),
  },
  clock: {
    label: 'Clock',
    defaultSize: { width: 320, height: 400 },
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
    createData: () => ({ url: 'https://example.com' }),
  },
  calendar: {
    label: 'Calendar',
    defaultSize: { width: 340, height: 360 },
    createData: () => ({ theme: 'LIGHT' }),
  },
  bookmarks: {
    label: 'Links',
    defaultSize: { width: 320, height: 380 },
    createData: () => ({ items: [], theme: 'LIGHT' }),
  },
  photo: {
    label: 'Photo',
    defaultSize: { width: 280, height: 320 },
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
    createData: () => ({ appKey: '', name: '', icon: null }),
  },
};
