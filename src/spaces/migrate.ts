import { SILENT_AMBIENCE } from '../ambience/engine';
import { asDocument } from '../widgets/memoContent';
import { DEFAULT_THEME_ID, THEMES } from '../themes/themes';
import { ColumnData, SCHEMA_VERSION, SpaceDoc, WidgetDoc, WidgetType } from './types';
import { columnHeight, COLUMN_WIDTH } from '../canvas/columns';
import { ownPartition, type SignIn } from './signIns';

// 2026-09-13에 장당 10MB PNG를 webp로 바꿨다. 그림은 같고 확장자만 다르다.
const PNG_TO_WEBP = [
  'alpine-cycle-bridge-v2', 'anime-coastal-platform', 'autumn-apple-orchard', 'cozy-cafe',
  'ghibli-night-tram', 'late-summer-aquarium', 'rain-window-reading-v2', 'rainy-laundrette',
  'rainy-reading-lounge', 'river-stone-bridge', 'snow-lake-greenhouse-v2', 'snowy-railway-halt',
  'spring-kite-cove', 'summer-lake-landing', 'winter-lake-greenhouse',
];

// Removed bundled assets need replacements in saved spaces and imported backups.
// Exact paths preserve user uploads, even when their filenames are the same.
const RETIRED_WALLPAPERS: Record<string, string> = {
  '/wallpapers/ghibli.jpg': '/wallpapers/summer-meadow.webp',
  '/wallpapers/winterhut.jpg': '/wallpapers/quiet-snow.webp',
  '/wallpapers/rainiywindow.jpg': '/wallpapers/autumn-breakfast-nook.webp',
  '/wallpapers/rainy-desk.webp': '/wallpapers/autumn-breakfast-nook.webp',
  '/wallpapers/ghibli-old-cinema.png': '/wallpapers/autumn-breakfast-nook.webp',
  '/wallpapers/warm-cabin.webp': '/wallpapers/quiet-snow.webp',
  '/wallpapers/morning-studio.webp': '/wallpapers/coastal-mist.webp',
  '/wallpapers/cloudtop-sanctuary.webp': '/wallpapers/summer-country-room.webp',
  '/wallpapers/aurora-fjord.webp': '/wallpapers/rainy-attic.webp',
  '/wallpapers/moonlit-conservatory.webp': '/wallpapers/afternoon-records.webp',
  ...Object.fromEntries(
    PNG_TO_WEBP.map((name) => [`/wallpapers/${name}.png`, `/wallpapers/${name}.webp`])
  ),
};

function currentWallpaper(src: string): string {
  return RETIRED_WALLPAPERS[src] ?? src;
}

/** The pre-v16 field, gone from `SpaceDoc`: which jar the whole space used. */
function legacySignIns(doc: SpaceDoc): { signIns?: 'shared' | 'separate' } {
  return doc as unknown as { signIns?: 'shared' | 'separate' };
}

/**
 * The sign-in a space carried before v16, for the store to put in its list.
 *
 * The list is app-wide, so it cannot be built inside a space document's own
 * migration — this is read from the stored document before `migrateSpace`
 * clears the field. The space's id is the sign-in's id, which is what the
 * v16 step stamps on its widgets.
 */
export function signInFromSpace(raw: SpaceDoc): SignIn | null {
  if ((raw?.schemaVersion ?? 0) >= 16) return null;
  // Before v15 there was no field: every space had a jar of its own.
  const own = raw.schemaVersion < 15 || legacySignIns(raw).signIns === 'separate';
  if (!own) return null;
  return { id: raw.id, name: raw.name?.trim() || 'Space', partition: ownPartition(raw.id) };
}

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

  if (doc.schemaVersion < 6) {
    // v6 dropped the two themes whose wallpapers had no licence anybody could
    // check. `getTheme` already falls back, but the stored id has to change too
    // or the picker shows nothing selected.
    if (!THEMES.some((t) => t.id === doc.themeId)) doc.themeId = DEFAULT_THEME_ID;
    doc.schemaVersion = 6;
  }

  if (doc.schemaVersion < 8) {
    // v8 made a column's box a pure function of its card count. Columns saved
    // by v7 carry whatever width and height an arrange had left on them, and
    // their cards carry positions that nothing reads any more.
    const widgets = { ...doc.widgets };
    for (const widget of Object.values(widgets)) {
      if (widget.type !== 'column') continue;
      const children = (widget.data as unknown as ColumnData).children.filter((id) => widgets[id]);
      widgets[widget.id] = {
        ...widget,
        width: COLUMN_WIDTH,
        height: columnHeight(children.length),
        data: { ...widget.data, children },
      };
    }
    doc.widgets = widgets;
    doc.schemaVersion = 8;
  }

  if (doc.schemaVersion < 9) {
    // v9 dropped the links widget. A column of page cards is the same list with
    // the page's own picture, name and line on each row, so the links are kept
    // as one — nothing a user saved is thrown away.
    const widgets = { ...doc.widgets };
    for (const widget of Object.values(doc.widgets)) {
      if ((widget.type as string) !== 'bookmarks') continue;
      delete widgets[widget.id];
      const links = ((widget.data as { items?: { title?: string; url?: string }[] }).items ?? [])
        .filter((item) => item.url);
      for (const [i, link] of links.entries()) {
        const id = `${widget.id}-${i}`;
        widgets[id] = {
          id,
          type: 'browser',
          x: widget.x,
          y: widget.y,
          width: 900,
          height: 620,
          z: widget.z,
          // Closed: a saved link is a card, and opening twelve of them at once
          // is not what a list of links was.
          data: { url: link.url!, title: link.title ?? '', open: false },
        };
      }
      widgets[widget.id] = {
        ...widget,
        type: 'column',
        width: COLUMN_WIDTH,
        height: columnHeight(links.length),
        data: { title: 'Links', children: links.map((_, i) => `${widget.id}-${i}`) },
      };
    }
    doc.widgets = widgets;
    doc.schemaVersion = 9;
  }

  // v13 also replaces bundled wallpapers retired after v12.
  if (doc.schemaVersion < 13 && doc.background?.type === 'IMAGE') {
    doc.background = { ...doc.background, value: currentWallpaper(doc.background.value) };
  }

  if (doc.schemaVersion < 12) {
    // v12 renamed the Swiss Editorial theme's id. Without this the stored id no
    // longer matches a theme and the space falls back to the default one.
    if (doc.themeId === 'bako') doc.themeId = 'swiss';
    doc.schemaVersion = 12;
  }


  if (doc.schemaVersion < 15) {
    // v15 let spaces share one sign-in. Every space saved before it has signed in
    // on a jar of its own, and moving it to the shared one would sign it out of
    // everything, so it stays separate until the user switches it.
    legacySignIns(doc).signIns = 'separate';
  }

  if (doc.schemaVersion < 16) {
    // v16 moved the choice of sign-in from the space to the widget (2026-09-18).
    // A space that had a jar of its own hands it to its own browser and web app
    // widgets, under the space's id — `signInFromSpace` puts that id in the list
    // with the same partition, so nothing is signed out.
    if (legacySignIns(doc).signIns === 'separate') {
      for (const widget of Object.values(doc.widgets ?? {})) {
        if (widget.type === 'browser' || widget.type === 'webapp') {
          (widget.data as { signIn?: string }).signIn = doc.id;
        }
      }
    }
    delete legacySignIns(doc).signIns;
  }

  if (doc.schemaVersion < 17) {
    // v17 cut the three arranges down to two (2026-09-19). Grid and Stack both
    // laid widgets out in rows, and Masonry packed them by height, so they land on
    // Rows and Compact. Only the setting changes here — the widgets keep the
    // positions and sizes they have until the user presses G again, and the new
    // arrange will not resize them at all.
    const mode = (doc.arrange as { mode?: string } | null | undefined)?.mode;
    if (mode === 'grid' || mode === 'stack') {
      doc.arrange = { mode: 'rows', columns: doc.arrange?.columns };
    } else if (mode === 'masonry') {
      // Columns were a lane count, and Compact works its own width out.
      doc.arrange = { mode: 'compact' };
    }
    doc.schemaVersion = 17;
  }

  // v14 added `arrange`, the last arrange this space was given. Missing means
  // Compact, the default, so there is nothing to convert. Modes cut from the menu
  // are converted whatever the version: an unknown one goes back to the default.
  if (doc.arrange && !['compact', 'rows'].includes(doc.arrange.mode)) {
    doc.arrange = null;
  }

  doc.schemaVersion = SCHEMA_VERSION;
  return doc;
}

// --- One-time import of the pre-rewrite MVP data (electron-store key
// 'focus-window-spaces-v13'). Widget types with no component yet are dropped. ---

// The MVP's freeform canvas stored shapes, text and images, not strokes, so it
// has no faithful counterpart here and is left out rather than half-converted.
// Neither app nor web app widgets existed then.
type LegacyMappedType = Exclude<WidgetType, 'sketch' | 'app' | 'webapp' | 'column'>;

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
  PHOTO: 'photo',
};

interface LegacyWidget {
  id: string;
  type: string;
  position: { x: number; y: number; width?: number; height?: number };
  theme?: 'LIGHT' | 'DARK';
  content?: string;
  title?: string;
  // Todo items and links both lived under `items` with different shapes.
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
        // v15, not the current version: `migrateSpace` runs over these on the way
        // in, and its v16 step is what hands this jar to the widgets.
        schemaVersion: 15,
        name: legacy.name,
        themeId: DEFAULT_THEME_ID,
        // The MVP's own wallpaper choice is kept, as an override on that theme.
        background:
          legacy.backgroundType === 'COLOR'
            ? { type: 'COLOR' as const, value: legacy.backgroundUrl }
            : { type: 'IMAGE' as const, value: currentWallpaper(legacy.backgroundUrl) },
        // Legacy widgets used screen pixels; treat them as world coordinates at 1:1.
        camera: { x: 0, y: 0, zoom: 1 },
        // The MVP stored ambience volumes but never played anything, so start silent.
        ambience: { ...SILENT_AMBIENCE },
        // Its widgets signed in on a jar of their own, as every space did then.
        // The v16 step turns that into a sign-in the widgets carry.
        signIns: 'separate' as const,
        widgets,
      };
    });
}
