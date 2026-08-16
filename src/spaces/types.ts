import type { Camera } from '../canvas/camera';

import type { AmbienceLevels } from '../ambience/engine';

export const SCHEMA_VERSION = 4;

export type WidgetType =
  | 'todo'
  | 'memo'
  | 'timer'
  | 'clock'
  | 'kanban'
  | 'browser'
  | 'calendar'
  | 'bookmarks'
  | 'photo'
  | 'sketch';

export interface WidgetDoc<D = Record<string, unknown>> {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number; // stacking order; higher is nearer the viewer
  data: D;
}

export interface SpaceDoc {
  id: string;
  schemaVersion: number;
  name: string;
  themeId: string;
  /** A wallpaper or colour the user picked themselves; null means the theme's own scene. */
  background: { type: 'COLOR' | 'IMAGE'; value: string } | null;
  camera: Camera;
  ambience: AmbienceLevels;
  widgets: Record<string, WidgetDoc>;
}

// --- Per-widget data shapes ---

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodoData {
  items: TodoItem[];
  theme: 'LIGHT' | 'DARK';
}

export interface MemoData {
  content: string;
  theme: 'LIGHT' | 'DARK';
}

export interface TimerData {
  duration: number; // seconds the timer is set to
  timeLeft: number;
  isRunning: boolean;
  mode: 'FOCUS' | 'BREAK';
}

export interface ClockData {
  theme: 'LIGHT' | 'DARK';
}

export interface KanbanCard {
  id: string;
  text: string;
}

export interface KanbanData {
  columns: { todo: KanbanCard[]; doing: KanbanCard[]; done: KanbanCard[] };
  theme: 'LIGHT' | 'DARK';
}

export interface BrowserData {
  url: string;
}

export interface CalendarData {
  theme: 'LIGHT' | 'DARK';
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
}

export interface BookmarksData {
  items: Bookmark[];
  theme: 'LIGHT' | 'DARK';
}

export interface PhotoData {
  url: string;
  caption: string;
}

export interface SketchStroke {
  id: string;
  color: string;
  width: number;
  /** Points in a fixed 1000×1000 user space, so strokes survive resizing. */
  points: { x: number; y: number }[];
}

export interface SketchData {
  strokes: SketchStroke[];
}
