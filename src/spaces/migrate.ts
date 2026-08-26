import { SILENT_AMBIENCE } from '../ambience/engine';
import { asDocument } from '../widgets/memoContent';
import { DEFAULT_THEME_ID, THEMES } from '../themes/themes';
import { SCHEMA_VERSION, SpaceDoc, WidgetDoc, WidgetType } from './types';

/**
 * Brings a stored space document up to the current schema.
 * Add a step per version bump; each step takes the previous shape and returns the next.
 */
export function migrateSpace(raw: SpaceDoc): SpaceDoc {
  const doc = { ...raw };

  if (doc.schemaVersion < 2) {
    // v2 gave widgets an explicit stacking order; seed it from insertion order.
    const widgets: Record<string, WidgetDoc> = {};
    Object.values(doc.widgets).forEach((widget, index) => {
      widgets[widget.id] = { ...widget, z: index };
    });
    doc.widgets = widgets;
    doc.schemaVersion = 2;
  }

  if (doc.schemaVersion < 3) {
    // v3 added the per-space ambience mixer.
    doc.ambience = doc.ambience ?? { ...SILENT_AMBIENCE };
    doc.schemaVersion = 3;
  }

  if (doc.schemaVersion < 4) {
    // v4 made the backdrop a theme. A background that is just one of the shipped
    // wallpapers becomes the matching theme; anything else the user chose stays
    // put as an override on top of the default theme.
    const matched = THEMES.find(
      (t) =>
        (t.scene.kind === 'image' && t.scene.src === doc.background?.value) ||
        (t.scene.kind === 'color' && t.scene.value === doc.background?.value)
    );
    doc.themeId = matched?.id ?? DEFAULT_THEME_ID;
    doc.background = matched ? null : doc.background;
    doc.schemaVersion = 4;
  }

  if (doc.schemaVersion < 5) {
    // v5 made a memo a document. Everything written into the old textarea is
    // plain text, so it is converted once here rather than guessed at on every
    // read.
    const widgets: Record<string, WidgetDoc> = {};
    Object.values(doc.widgets).forEach((widget) => {
      if (widget.type !== 'memo') {
        widgets[widget.id] = widget;
        return;
      }
      const data = widget.data as { content?: string };
      widgets[widget.id] = { ...widget, data: { ...data, content: asDocument(data.content ?? '') } };
    });
    doc.widgets = widgets;
    doc.schemaVersion = 5;
  }

  doc.schemaVersion = SCHEMA_VERSION;
  return doc;
}

// --- One-time import of the pre-rewrite MVP data (electron-store key
// 'focus-window-spaces-v13'). Widget types with no component yet are dropped. ---

// The MVP's freeform canvas stored shapes, text and images, not strokes, so it
// has no faithful counterpart here and is left out rather than half-converted.
// Neither app nor web app widgets existed then.
type LegacyMappedType = Exclude<WidgetType, 'sketch' | 'app' | 'webapp'>;

const LEGACY_TYPE_MAP: Record<string, LegacyMappedType> = {
  TODO: 'todo',
  MEMO: 'memo',
  NEW_MEMO: 'memo',
  EDITOR: 'memo',
  NEW_EDITOR: 'memo',
  TIMER: 'timer',
  CLOCK: 'clock',
  KANBAN: 'kanban',
  BROWSER: 'browser',
  CALENDAR: 'calendar',
  BOOKMARKS: 'bookmarks',
  PHOTO: 'photo',
};

interface LegacyWidget {
  id: string;
  type: string;
  position: { x: number; y: number; width?: number; height?: number };
  theme?: 'LIGHT' | 'DARK';
  content?: string;
  title?: string;
  // Todo items and bookmarks both lived under `items` with different shapes.
  items?: {
    id: string;
    text?: string;
    completed?: boolean;
    title?: string;
    url?: string;
  }[];
  columns?: { todo: unknown[]; doing: unknown[]; done: unknown[] };
  duration?: number;
  timeLeft?: number;
  mode?: 'FOCUS' | 'BREAK';
  url?: string;
  caption?: string;
}

interface LegacySpace {
  id: string;
  name: string;
  backgroundUrl: string;
  backgroundType: 'IMAGE' | 'VIDEO' | 'COLOR';
  widgets: LegacyWidget[];
}

function convertWidget(legacy: LegacyWidget, z: number): WidgetDoc | null {
  const type = LEGACY_TYPE_MAP[legacy.type];
  if (!type) return null;

  const theme = legacy.theme ?? 'LIGHT';
  let data: Record<string, unknown>;

  switch (type) {
    case 'todo':
      data = {
        theme,
        items: (legacy.items ?? []).map((i) => ({
          id: i.id,
          text: i.text ?? '',
          done: i.completed ?? false,
        })),
      };
      break;
    case 'memo':
      // Legacy editors carried a separate title; fold it into the body.
      data = {
        theme,
        content: asDocument(
          legacy.title ? `${legacy.title}\n\n${legacy.content ?? ''}` : (legacy.content ?? '')
        ),
      };
      break;
    case 'timer':
      data = {
        duration: legacy.duration ?? 25 * 60,
        timeLeft: legacy.timeLeft ?? legacy.duration ?? 25 * 60,
        isRunning: false,
        mode: legacy.mode ?? 'FOCUS',
      };
      break;
    case 'clock':
      data = { theme };
      break;
    case 'kanban':
      data = { theme, columns: legacy.columns ?? { todo: [], doing: [], done: [] } };
      break;
    case 'browser':
      data = { url: legacy.url ?? '' };
      break;
    case 'calendar':
      data = { theme };
      break;
    case 'photo':
      data = { url: legacy.url ?? '', caption: legacy.caption ?? '' };
      break;
    case 'bookmarks':
      data = {
        theme,
        items: (legacy.items ?? [])
          .filter((i) => i.url)
          .map((i) => ({ id: i.id, title: i.title ?? i.url!, url: i.url! })),
      };
      break;
  }

  return {
    id: legacy.id,
    type,
    x: legacy.position.x,
    y: legacy.position.y,
    width: legacy.position.width ?? 350,
    height: legacy.position.height ?? 400,
    z,
    data,
  };
}

export function migrateLegacySpaces(raw: unknown): SpaceDoc[] {
  if (!Array.isArray(raw)) return [];

  return (raw as LegacySpace[])
    .filter((s) => s && typeof s.id === 'string')
    .map((legacy) => {
      const widgets: Record<string, WidgetDoc> = {};
      (legacy.widgets ?? []).forEach((lw, index) => {
        const widget = convertWidget(lw, index);
        if (widget) widgets[widget.id] = widget;
      });
      return {
        id: legacy.id,
        schemaVersion: SCHEMA_VERSION,
        name: legacy.name,
        themeId: DEFAULT_THEME_ID,
        // The MVP's own wallpaper choice is kept, as an override on that theme.
        background:
          legacy.backgroundType === 'COLOR'
            ? { type: 'COLOR' as const, value: legacy.backgroundUrl }
            : { type: 'IMAGE' as const, value: legacy.backgroundUrl },
        // Legacy widgets used screen pixels; treat them as world coordinates at 1:1.
        camera: { x: 0, y: 0, zoom: 1 },
        // The MVP stored ambience volumes but never played anything, so start silent.
        ambience: { ...SILENT_AMBIENCE },
        widgets,
      };
    });
}
