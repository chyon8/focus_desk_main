import type { Camera } from '../canvas/camera';

import type { AmbienceLevels } from '../ambience/engine';
import type { ParticleKind } from '../themes/types';

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
  | 'sketch'
  | 'app';

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

/** Weather the user picked for a space, overriding whatever the theme brings. */
export interface ParticlesChoice {
  /** 'none' clears the theme's own weather without changing the theme. */
  kind: ParticleKind | 'none';
  /** 0–1, as the theme's own density is. */
  density: number;
}

export interface SpaceDoc {
  id: string;
  schemaVersion: number;
  name: string;
  themeId: string;
  /** A wallpaper or colour the user picked themselves; null means the theme's own scene. */
  background: { type: 'COLOR' | 'IMAGE'; value: string } | null;
  /**
   * Weather the user picked for this space; absent means the theme's own. Kept
   * apart from `themeId` for the same reason `background` is — a room's look and
   * its weather are two choices, not one (D-066).
   */
  particles?: ParticlesChoice | null;
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
  /** Page zoom, like a browser's ⌘+/⌘−. 1 is 100%. */
  zoom?: number;
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

/**
 * A real OS application standing in the space (D-038). Also the shape the app
 * picker lists, since picking one is exactly filling this in.
 */
export interface AppData {
  /** Opaque here: a bundle id on macOS, an exe path on Windows. Empty = unpicked. */
  appKey: string;
  name: string;
  /** PNG data URI, copied in when the app was picked so it survives offline. */
  icon: string | null;
  /**
   * The window this widget was last placed on, for apps that keep several open
   * (D-045). Rewritten on every placement so it follows a window whose title
   * changes, and only ever a hint — an unmatched title falls back to the app's
   * focused window.
   */
  windowTitle?: string;
}
