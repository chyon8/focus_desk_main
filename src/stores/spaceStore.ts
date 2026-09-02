import { create } from 'zustand';
import type { AmbienceLevels } from '../ambience/engine';
import { SILENT_AMBIENCE } from '../ambience/engine';
import { MIN_ZOOM, type Camera } from '../canvas/camera';
import {
  arrange,
  ArrangeMode,
  centreCamera,
  clampCamera,
  findFreeSpot,
  fitCamera,
  isFullyVisible,
  minZoomFor,
} from '../canvas/layout';
import {
  columnAt,
  COLUMN_CARD_HEIGHT,
  columnHeight,
  COLUMN_WIDTH,
  dropIndex,
} from '../canvas/columns';
import { useAppTimeStore } from './appTimeStore';
import { useSpaceTimeStore } from './spaceTimeStore';
import { canvasArea, useUiStore } from './uiStore';
import { migrateLegacySpaces, migrateSpace } from '../spaces/migrate';
import {
  ColumnData,
  ParticlesChoice,
  SCHEMA_VERSION,
  SpaceDoc,
  WidgetDoc,
  WidgetType,
} from '../spaces/types';
import { DEFAULT_THEME_ID } from '../themes/themes';
import { WIDGET_DEFS } from '../widgets/defs';

const ACTIVE_SPACE_KEY = 'active-space-id';
const LEGACY_SPACES_KEY = 'focus-window-spaces-v13';
const SAVE_DEBOUNCE_MS = 500;
const MIN_WIDGET_SIZE = 140;
// Far enough that the copy reads as a second widget, near enough to be the same one.
const DUPLICATE_OFFSET = 24;
// Clear space between what the target already holds and what lands in it.
const MOVE_GAP = 48;
// A dragged widget is held by its header, so it is set down with the pointer on
// that header rather than in the middle of a page it would then cover.
const HEADER_DROP_OFFSET = 20;

interface SpaceState {
  spaces: Record<string, SpaceDoc>;
  activeSpaceId: string;
  isLoaded: boolean;
  /** True for one run only: the profile was empty when the app started. */
  needsOnboarding: boolean;

  load: () => Promise<void>;
  /**
   * Hands back the new id. `activate` is false when a space is made to receive
   * widgets — the user is tidying and should stay where they are.
   */
  addSpace: (name: string, activate?: boolean) => string;
  /** Adds spaces built elsewhere — the Chrome import — and opens the first. */
  addSpaces: (docs: SpaceDoc[]) => void;
  renameSpace: (id: string, name: string) => void;
  removeSpace: (id: string) => void;
  setActiveSpace: (id: string) => void;

  setCamera: (camera: Camera) => void;
  setTheme: (themeId: string) => void;
  setBackground: (background: SpaceDoc['background']) => void;
  /** Theme, wallpaper and sound in one write. See the implementation for why. */
  setRoom: (
    themeId: string,
    background: SpaceDoc['background'],
    ambience: AmbienceLevels
  ) => void;
  setAmbience: (ambience: AmbienceLevels) => void;
  /** Null hands the weather back to the theme. */
  setParticles: (particles: ParticlesChoice | null) => void;
  arrangeWidgets: (mode?: ArrangeMode, columns?: number) => void;
  fitToWidgets: () => void;
  /**
   * `at` is a world point the widget is centred on — where the palette icon was
   * dropped. Hands back the new id, so a caller can look at where it landed.
   */
  addWidget: (
    type: WidgetType,
    data?: Record<string, unknown>,
    at?: { x: number; y: number }
  ) => string;
  /** Copies widgets, contents and all, offset so the copy is visible on top. */
  duplicateWidgets: (ids: string[]) => void;
  /** Sets the stacking order from a list given most recently used first. */
  orderWidgets: (ids: string[]) => void;
  bringToFront: (id: string) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  /** Moves a whole selection by one delta, so the group keeps its shape. */
  moveWidgets: (ids: string[], dx: number, dy: number) => void;
  resizeWidget: (id: string, width: number, height: number) => void;
  updateWidgetData: (id: string, patch: Record<string, unknown>) => void;
  removeWidget: (id: string) => void;
  /** Closes a whole selection at once, so one undo brings all of it back. */
  removeWidgets: (ids: string[]) => void;
  /** Puts widgets into a new column, in the order they are read down the canvas. */
  groupIntoColumn: (ids: string[]) => void;
  /** Which column and slot a world point would drop into, or null out in the open. */
  columnSlotAt: (id: string, at: { x: number; y: number }) => { columnId: string; index: number } | null;
  /** Puts a widget into a column at a slot — from the canvas, from another column, or reordered in its own. */
  dropIntoColumnAt: (id: string, columnId: string, index: number) => void;
  /** Loads the page a card stands for and opens it where it stands. It stays in the column. */
  openFromColumn: (id: string) => void;
  /** Puts a card back to being a card: the page it was showing is unloaded. */
  closeIntoColumn: (id: string) => void;
  /**
   * Puts a card back on the canvas. `open` loads a page again; taking it out
   * without opening leaves it as it was. `at` is where the card was let go —
   * without one it is set down beside the column it came from.
   */
  takeOutOfColumn: (id: string, open: boolean, at?: { x: number; y: number }) => void;
  /** Sends widgets to another space, keeping the shape of the group. */
  moveWidgetsToSpace: (ids: string[], targetSpaceId: string) => void;
  /** The widgets sent away by the last move, kept so the toast can bring them back. */
  lastMoved: { fromSpaceId: string; toSpaceId: string; widgets: WidgetDoc[] } | null;
  undoMove: () => void;
  dismissMoved: () => void;
  /** The widgets closed by the last close, kept so the toast can put them back. */
  lastRemoved: { spaceId: string; widgets: WidgetDoc[] } | null;
  undoRemove: () => void;
  dismissRemoved: () => void;
  /**
   * The last space deleted. Nothing on disk is touched while this is set — the
   * file, the logged time and the cookie jar are gone for good once it clears,
   * so they wait for the undo window to close.
   */
  lastRemovedSpace: { doc: SpaceDoc; wasActive: boolean } | null;
  undoRemoveSpace: () => void;
  dismissRemovedSpace: () => void;
}

/** Throws a space away for good: its file and cookie jar (D-074), its logged time. */
function destroySpace(id: string) {
  void window.spaces?.delete(id);
  // Its logged time goes with it, rather than lingering as a nameless row.
  useSpaceTimeStore.getState().forget(id);
  useAppTimeStore.getState().forget(id);
}

/** Whether the user has singled widgets out — arrange and fit then leave the rest alone. */
function isSelection(space: SpaceDoc) {
  return useUiStore.getState().selectedIds.some((id) => space.widgets[id]);
}

/** The widgets an arrange or a fit acts on: the selection, or everything. */
function inPlay(space: SpaceDoc) {
  const selected = useUiStore.getState().selectedIds.filter((id) => space.widgets[id]);
  const boxes = selected.length
    ? selected.map((id) => space.widgets[id])
    : Object.values(space.widgets);
  // A column's children are placed by their column. An arrange that moved them
  // would be undone by the next `applyColumn`, and a fit already covers them —
  // they are inside the column's own box.
  return boxes.filter((widget) => !ownerOf(space.widgets, widget.id));
}

/** An empty space doc. Exported for the Chrome import, which fills one in. */
export function newSpace(name: string): SpaceDoc {
  return {
    id: crypto.randomUUID(),
    schemaVersion: SCHEMA_VERSION,
    name,
    themeId: DEFAULT_THEME_ID,
    background: null,
    camera: { x: -40, y: -40, zoom: 1 },
    ambience: { ...SILENT_AMBIENCE },
    widgets: {},
  };
}

/** A column's own data, for the many places that have a `WidgetDoc` and want its list. */
function columnData(widget: WidgetDoc): ColumnData {
  return widget.data as unknown as ColumnData;
}

/** The column holding this widget, if any. */
function ownerOf(widgets: Record<string, WidgetDoc>, id: string): WidgetDoc | undefined {
  return Object.values(widgets).find(
    (w) => w.type === 'column' && columnData(w).children.includes(id)
  );
}

/**
 * The one place a column's own box is set. A column is exactly as wide as every
 * column and exactly as tall as its card count, so this is the whole of it —
 * the cards are drawn inside the column's body and have no box of their own to
 * maintain. Children that no longer exist drop out of the list on the way
 * through, so nothing else has to remember to tidy up.
 */
function applyColumn(
  widgets: Record<string, WidgetDoc>,
  columnId: string
): Record<string, WidgetDoc> {
  const column = widgets[columnId];
  if (!column || column.type !== 'column') return widgets;

  const children = columnData(column).children.filter((id) => widgets[id]);
  return {
    ...widgets,
    [columnId]: {
      ...column,
      width: COLUMN_WIDTH,
      height: columnHeight(children.length),
      data: { ...columnData(column), children } as unknown as WidgetDoc['data'],
    },
  };
}

/** Re-runs every column, for changes that could have touched any of them. */
function applyColumns(widgets: Record<string, WidgetDoc>): Record<string, WidgetDoc> {
  return Object.values(widgets)
    .filter((w) => w.type === 'column')
    .reduce((acc, column) => applyColumn(acc, column.id), widgets);
}

/**
 * What a page becomes on the way into a column: closed. A page kept live in a
 * column would give back the space but not the Chromium renderer holding it,
 * and the column draws a card for it either way.
 */
function asCard(widget: WidgetDoc): WidgetDoc {
  if (widget.type !== 'browser' && widget.type !== 'webapp') return widget;
  return { ...widget, data: { ...widget.data, open: false } };
}

/** And what it becomes on the way out, when the way out was opening it. */
function asPage(widget: WidgetDoc): WidgetDoc {
  if (widget.type !== 'browser' && widget.type !== 'webapp') return widget;
  const size = WIDGET_DEFS[widget.type].defaultSize;
  return { ...widget, ...size, data: { ...widget.data, open: true } };
}

/**
 * Where a card let go at `at` will stand: the size it opens at, centred on the
 * pointer. For the outline drawn under a card being dragged into the open —
 * `takeOutOfColumn` places it by the same rule, on a widget it has already
 * opened.
 */
export function dropRectAt(widget: WidgetDoc, at: { x: number; y: number }) {
  const opened = asPage(widget);
  return {
    x: at.x - opened.width / 2,
    y: at.y - HEADER_DROP_OFFSET,
    width: opened.width,
    height: opened.height,
  };
}

/**
 * Says where a widget landed when it landed somewhere the user cannot see, and
 * offers to go there. Nothing moves on its own — the user is still reading what
 * they were reading, and being thrown across the canvas is worse than a line of
 * text.
 *
 * A widget is out of sight two ways: off the edge of the view, or underneath a
 * maximised widget, which covers the whole canvas. Only the first was counted,
 * so opening a link in a new tab from a maximised page looked like it had done
 * nothing at all — the new widget was there, behind the page being read.
 */
export function showWhereItLanded(widget: WidgetDoc, label: string) {
  const ui = useUiStore.getState();
  const covered = ui.maximizedWidgetId !== null && ui.maximizedWidgetId !== widget.id;
  if (!covered && isFullyVisible(getCamera(), widget, canvasArea())) return;

  ui.showNotice(label, {
    label: 'Show',
    run: () => {
      const store = useSpaceStore.getState();
      const current = store.spaces[store.activeSpaceId]?.widgets[widget.id];
      if (!current) return;
      useUiStore.getState().clearMaximized();
      store.setCamera(centreCamera(getCamera(), current, canvasArea()));
    },
  });
}

/** The widgets a column holds, and the column itself — what an operation on a column really acts on. */
function withChildren(space: SpaceDoc, ids: string[]): string[] {
  const all = new Set(ids);
  for (const id of ids) {
    const widget = space.widgets[id];
    if (widget?.type === 'column') for (const child of columnData(widget).children) all.add(child);
  }
  return [...all];
}

function topZ(space: SpaceDoc) {
  return Object.values(space.widgets).reduce((max, w) => Math.max(max, w.z), 0);
}

/**
 * The widget the drag now in progress took out of a column. Only the drop needs
 * it — a card let go in the open opens its page again, while a card that was
 * never in a column (an imported tab) is left as it is.
 */
let detachedFromColumn: string | null = null;

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Writes out every space whose debounced save has not fired yet. Called from
 * `beforeunload`, so it has to be the blocking channel: the window is being torn
 * down and an async write would never land (same reason as the time stores).
 */
export function flushSaves() {
  // A deletion still inside its undo window is committed here. `spaces:delete`
  // is an async invoke and may lose the race with the teardown; if it does, the
  // space comes back on the next launch, which is the side to fail on.
  useSpaceStore.getState().dismissRemovedSpace();

  if (saveTimers.size === 0) return;
  const { spaces } = useSpaceStore.getState();
  for (const [id, timer] of saveTimers) {
    clearTimeout(timer);
    const doc = spaces[id];
    if (doc) window.spaces?.saveSync(doc);
  }
  saveTimers.clear();
}

function scheduleSave(doc: SpaceDoc) {
  const existing = saveTimers.get(doc.id);
  if (existing) clearTimeout(existing);
  saveTimers.set(
    doc.id,
    setTimeout(() => {
      saveTimers.delete(doc.id);
      // Read the latest version rather than the one captured when scheduling.
      const latest = useSpaceStore.getState().spaces[doc.id];
      if (latest) void window.spaces?.save(latest);
    }, SAVE_DEBOUNCE_MS)
  );
}

/** Applies an update to the active space and persists it. */
function updateActive(
  set: (fn: (state: SpaceState) => Partial<SpaceState>) => void,
  mutate: (space: SpaceDoc) => SpaceDoc
) {
  set((state) => {
    const current = state.spaces[state.activeSpaceId];
    if (!current) return {};
    const next = mutate(current);
    scheduleSave(next);
    return { spaces: { ...state.spaces, [next.id]: next } };
  });
}

/** Guards `load` against the double call React makes in development. */
let loading = false;

export const useSpaceStore = create<SpaceState>((set, get) => ({
  spaces: {},
  activeSpaceId: '',
  isLoaded: false,
  needsOnboarding: false,

  load: async () => {
    // React runs effects twice in development, so this is called twice before
    // the first call has written anything — and two concurrent first runs each
    // create a default space. One load is enough either way.
    if (loading) return;
    loading = true;

    let docs: SpaceDoc[] = ((await window.spaces?.list()) ?? []) as SpaceDoc[];

    // Nothing saved and nothing to migrate: this is somebody's first run, and
    // the onboarding runs over the empty space rather than instead of it. The
    // space is real from the start, so nothing downstream has to cope with an
    // app that has no active space (D-097).
    let needsOnboarding = false;
    if (docs.length === 0) {
      // First run on this machine: adopt the pre-rewrite MVP data if it is there.
      const legacy = await window.store?.get(LEGACY_SPACES_KEY);
      docs = migrateLegacySpaces(legacy);
      if (docs.length === 0) {
        // Empty on a first run: the onboarding puts the widgets in, and the
        // starter memo and timer would otherwise show through it and then be
        // left behind next to what the user actually chose.
        needsOnboarding = true;
        docs = [newSpace('Home')];
      }
      for (const doc of docs) void window.spaces?.save(doc);
    }

    const spaces: Record<string, SpaceDoc> = {};
    for (const doc of docs) {
      // Every column is put right on the way in: its box is a function of its
      // card count, and a document written by an older build — or by a build
      // whose card height was a different number — carries whatever it had.
      const space = migrateSpace(doc);
      spaces[doc.id] = { ...space, widgets: applyColumns(space.widgets) };
    }

    const savedId = (await window.store?.get(ACTIVE_SPACE_KEY)) as string | undefined;
    const activeSpaceId = savedId && spaces[savedId] ? savedId : docs[0].id;

    set({ spaces, activeSpaceId, isLoaded: true, needsOnboarding });
  },

  addSpace: (name, activate = true) => {
    const space = newSpace(name.trim() || 'Untitled');
    void window.spaces?.save(space);
    if (activate) void window.store?.set(ACTIVE_SPACE_KEY, space.id);
    set((state) => ({
      spaces: { ...state.spaces, [space.id]: space },
      activeSpaceId: activate ? space.id : state.activeSpaceId,
    }));
    return space.id;
  },

  addSpaces: (docs) => {
    if (docs.length === 0) return;
    for (const doc of docs) void window.spaces?.save(doc);
    void window.store?.set(ACTIVE_SPACE_KEY, docs[0].id);
    set((state) => ({
      spaces: { ...state.spaces, ...Object.fromEntries(docs.map((doc) => [doc.id, doc])) },
      activeSpaceId: docs[0].id,
    }));
  },

  renameSpace: (id, name) =>
    set((state) => {
      const current = state.spaces[id];
      const trimmed = name.trim();
      if (!current || !trimmed || trimmed === current.name) return {};
      const next = { ...current, name: trimmed };
      scheduleSave(next);
      return { spaces: { ...state.spaces, [id]: next } };
    }),

  removeSpace: (id) => {
    const { spaces, activeSpaceId, lastRemovedSpace } = get();
    const doc = spaces[id];
    const remaining = Object.keys(spaces).filter((sid) => sid !== id);
    if (!doc || remaining.length === 0) return; // Never leave the app with no space.

    // Only one deletion can be waiting at a time; the one before it goes now.
    if (lastRemovedSpace) destroySpace(lastRemovedSpace.doc.id);

    const nextSpaces = { ...spaces };
    delete nextSpaces[id];
    const wasActive = activeSpaceId === id;
    const nextActive = wasActive ? remaining[0] : activeSpaceId;
    if (wasActive) void window.store?.set(ACTIVE_SPACE_KEY, nextActive);
    set({
      spaces: nextSpaces,
      activeSpaceId: nextActive,
      lastRemovedSpace: { doc, wasActive },
    });
  },

  undoRemoveSpace: () =>
    set((state) => {
      const removed = state.lastRemovedSpace;
      if (!removed) return { lastRemovedSpace: null };
      // Nothing was deleted yet, so putting the document back is the whole undo.
      const activeSpaceId = removed.wasActive ? removed.doc.id : state.activeSpaceId;
      if (removed.wasActive) void window.store?.set(ACTIVE_SPACE_KEY, activeSpaceId);
      return {
        spaces: { ...state.spaces, [removed.doc.id]: removed.doc },
        activeSpaceId,
        lastRemovedSpace: null,
      };
    }),

  dismissRemovedSpace: () => {
    const removed = get().lastRemovedSpace;
    if (!removed) return;
    destroySpace(removed.doc.id);
    set({ lastRemovedSpace: null });
  },

  setActiveSpace: (id) => {
    void window.store?.set(ACTIVE_SPACE_KEY, id);
    set({ activeSpaceId: id });
  },

  setCamera: (camera) =>
    updateActive(set, (space) => ({
      ...space,
      camera: clampCamera(camera, Object.values(space.widgets), canvasArea()),
    })),

  // Choosing a theme drops what the user had layered on top of the old one — the
  // wallpaper would keep the new scene hidden, and the weather would keep raining
  // in a room that no longer has that sky.
  setTheme: (themeId) =>
    updateActive(set, (space) => ({ ...space, themeId, background: null, particles: null })),

  setBackground: (background) => updateActive(set, (space) => ({ ...space, background })),

  /**
   * One write, because `SceneLayer` crossfades whenever the scene changes and
   * three writes are three scenes.
   *
   * Setting them one at a time — which is what the onboarding did — starts a
   * fade towards the theme's own wallpaper (`setTheme` clears the override),
   * then interrupts it with a fade towards the real one. What the user sees
   * while picking a room is half of a scene nobody chose.
   */
  setRoom: (themeId, background, ambience) =>
    updateActive(set, (space) => ({ ...space, themeId, background, particles: null, ambience })),

  setAmbience: (ambience) => updateActive(set, (space) => ({ ...space, ambience })),

  setParticles: (particles) => updateActive(set, (space) => ({ ...space, particles })),

  // Fill the canvas with the widgets in play, then frame the result.
  arrangeWidgets: (mode = 'grid', columns) =>
    updateActive(set, (space) => {
      const boxes = inPlay(space);
      if (boxes.length === 0) return space;

      // A selection is tidied where it already sits; everything else goes to the
      // world origin as before.
      const anchor = isSelection(space)
        ? { x: Math.min(...boxes.map((b) => b.x)), y: Math.min(...boxes.map((b) => b.y)) }
        : { x: 0, y: 0 };

      const area = canvasArea();
      // Most recently used first: `z` is bumped every time a widget is touched,
      // so the top of the stack is also the thing worked on last.
      // `natural` is the size the widget was designed at, which is the ceiling an
      // arrange grows it against — without it a grid fills the cell it is given,
      // and one clock in a space got half the screen.
      const ordered = [...boxes]
        .sort((a, b) => b.z - a.z)
        .map((w) =>
          w.type === 'column'
            ? { ...w, fixed: true }
            : { ...w, natural: WIDGET_DEFS[w.type].defaultSize }
        );
      const placements = arrange(ordered, area, mode, columns);
      const widgets = { ...space.widgets };
      for (const [id, place] of Object.entries(placements)) {
        const isColumn = widgets[id].type === 'column';
        widgets[id] = {
          ...widgets[id],
          x: place.x + anchor.x,
          y: place.y + anchor.y,
          // A column owns its size — the arrange only says where it goes.
          width: isColumn ? widgets[id].width : place.width,
          height: isColumn ? widgets[id].height : place.height,
        };
      }
      const laid = applyColumns(widgets);
      const camera = fitCamera(inPlay({ ...space, widgets: laid }), area);
      return { ...space, widgets: laid, camera: camera ?? space.camera };
    }),

  fitToWidgets: () =>
    updateActive(set, (space) => {
      const area = canvasArea();
      const camera = fitCamera(inPlay(space), area);
      return camera ? { ...space, camera } : space;
    }),

  addWidget: (type, data, at) => {
    const def = WIDGET_DEFS[type];
    let created = '';
    updateActive(set, (space) => {
      // Dropped from the palette: centre it on the pointer. Clicked: the middle of
      // the canvas area the user is looking at.
      const area = canvasArea();
      const widget: WidgetDoc = {
        id: crypto.randomUUID(),
        type,
        x: at
          ? at.x - def.defaultSize.width / 2
          : space.camera.x + (area.width / space.camera.zoom - def.defaultSize.width) / 2,
        y: at
          ? at.y - def.defaultSize.height / 2
          : space.camera.y +
            (area.y + (area.height - def.defaultSize.height * space.camera.zoom) / 2) /
              space.camera.zoom,
        ...def.defaultSize,
        z: topZ(space) + 1,
        data: { ...def.createData(), ...data },
      };
      created = widget.id;
      return { ...space, widgets: { ...space.widgets, [widget.id]: widget } };
    });
    return created;
  },

  duplicateWidgets: (ids) =>
    updateActive(set, (space) => {
      let widgets = { ...space.widgets };
      let z = topZ(space);
      const copies: string[] = [];
      /** Old id → new id, so a copied column can point at the copied cards. */
      const newIdOf: Record<string, string> = {};

      // A column is copied with its children — two columns pointing at the same
      // cards would fight over where those cards sit.
      for (const id of withChildren(space, ids)) {
        const source = space.widgets[id];
        if (!source) continue;
        z += 1;
        const copy: WidgetDoc = {
          ...source,
          id: crypto.randomUUID(),
          x: source.x + DUPLICATE_OFFSET,
          y: source.y + DUPLICATE_OFFSET,
          z,
          data: structuredClone(source.data),
        };
        // Two app widgets must not claim the same window: the copy starts with no
        // window chosen, so it takes another one of that app's (D-072).
        if (copy.type === 'app') delete (copy.data as { windowTitle?: string }).windowTitle;
        widgets[copy.id] = copy;
        copies.push(copy.id);
        newIdOf[id] = copy.id;
      }

      // Point each copied column at its own copies, then stack them.
      let laid = widgets;
      for (const id of copies) {
        if (laid[id].type !== 'column') continue;
        const data = columnData(laid[id]);
        laid = {
          ...laid,
          [id]: {
            ...laid[id],
            data: {
              ...data,
              children: data.children.map((child) => newIdOf[child]).filter(Boolean),
            } as unknown as WidgetDoc['data'],
          },
        };
        laid = applyColumn(laid, id);
      }
      widgets = laid;

      // Copying a group leaves the group picked out — otherwise the next drag
      // moves the originals, which is not what was just asked for.
      if (useUiStore.getState().selectedIds.length > 1) {
        useUiStore.getState().setSelection(copies);
      }
      return { ...space, widgets };
    }),

  /**
   * Rewrites the stacking order, most recently used first.
   *
   * `z` is what "recently used" means here — `arrangeWidgets` sorts by it, so it
   * decides which widgets a `focus` arrange makes big. Widgets created in a
   * batch would otherwise rank by the order they were added, which put an empty
   * memo above the tabs the user had just been reading.
   */
  orderWidgets: (ids) =>
    updateActive(set, (space) => {
      const widgets = { ...space.widgets };
      ids.forEach((id, i) => {
        if (widgets[id]) widgets[id] = { ...widgets[id], z: ids.length - i };
      });
      return { ...space, widgets };
    }),

  bringToFront: (id) =>
    updateActive(set, (space) => {
      const widget = space.widgets[id];
      if (!widget || widget.z === topZ(space)) return space;
      const raised = { ...space.widgets, [id]: { ...widget, z: topZ(space) + 1 } };
      // A column that came forward has to bring its children, or it covers them.
      return { ...space, widgets: applyColumn(raised, id) };
    }),

  // Moving a column does not move its children here: `applyColumn` puts them
  // back under it wherever it has gone, which is the same thing and cannot drift.
  moveWidget: (id, x, y) =>
    updateActive(set, (space) => ({
      ...space,
      widgets: applyColumn({ ...space.widgets, [id]: { ...space.widgets[id], x, y } }, id),
    })),

  moveWidgets: (ids, dx, dy) =>
    updateActive(set, (space) => {
      let widgets = { ...space.widgets };
      for (const id of ids) {
        const widget = widgets[id];
        if (widget) widgets[id] = { ...widget, x: widget.x + dx, y: widget.y + dy };
      }
      for (const id of ids) widgets = applyColumn(widgets, id);
      return { ...space, widgets };
    }),

  resizeWidget: (id, width, height) =>
    updateActive(set, (space) => {
      const widget = space.widgets[id];
      const widgets = {
        ...space.widgets,
        [id]: {
          ...widget,
          width: Math.max(MIN_WIDGET_SIZE, width),
          // A column is as tall as what it holds, so the drag only sets its width.
          height: widget.type === 'column' ? widget.height : Math.max(MIN_WIDGET_SIZE, height),
        },
      };
      // Either the column itself was dragged, or a card in one grew and the rest
      // have to move down.
      const owner = ownerOf(space.widgets, id);
      return { ...space, widgets: applyColumn(widgets, owner ? owner.id : id) };
    }),

  updateWidgetData: (id, patch) =>
    updateActive(set, (space) => ({
      ...space,
      widgets: {
        ...space.widgets,
        [id]: { ...space.widgets[id], data: { ...space.widgets[id].data, ...patch } },
      },
    })),

  removeWidget: (id) => get().removeWidgets([id]),

  removeWidgets: (rawIds) => {
    const ui = useUiStore.getState();
    const { spaces, activeSpaceId } = get();
    const space = spaces[activeSpaceId];
    if (!space) return;
    // Closing a column closes what is in it — and one undo brings all of it back,
    // since the toast restores whatever this list held.
    const ids = withChildren(space, rawIds);

    ui.setSelection(ui.selectedIds.filter((selected) => !ids.includes(selected)));
    const closed = ids
      .map((id) => space.widgets[id])
      .filter((widget): widget is WidgetDoc => !!widget);
    if (closed.length === 0) return;
    set({ lastRemoved: { spaceId: activeSpaceId, widgets: closed } });
    updateActive(set, (current) => {
      const widgets = { ...current.widgets };
      for (const id of ids) delete widgets[id];
      // A card closed out of a column leaves a gap the column has to close up.
      return { ...current, widgets: applyColumns(widgets) };
    });
  },

  groupIntoColumn: (ids) =>
    updateActive(set, (space) => {
      // A column inside a column is not a thing yet, and a card already in one is
      // already where it is going.
      const members = ids
        .map((id) => space.widgets[id])
        .filter((w): w is WidgetDoc => !!w && w.type !== 'column' && !ownerOf(space.widgets, w.id))
        .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));
      if (members.length === 0) return space;

      const column: WidgetDoc = {
        id: crypto.randomUUID(),
        type: 'column',
        x: Math.min(...members.map((w) => w.x)),
        y: Math.min(...members.map((w) => w.y)),
        ...WIDGET_DEFS.column.defaultSize,
        z: topZ(space) + 1,
        data: { title: '', children: members.map((w) => w.id) },
      };

      const widgets = { ...space.widgets, [column.id]: column };
      for (const member of members) widgets[member.id] = asCard(member);
      useUiStore.getState().setSelection([column.id]);
      return { ...space, widgets: applyColumn(widgets, column.id) };
    }),

  openFromColumn: (id) => {
    updateActive(set, (space) => {
      const widget = space.widgets[id];
      if (!widget) return space;
      // A page has to be told to load: in the column it is a card, and the panel
      // is where it is drawn as itself.
      const opened =
        widget.type === 'browser' || widget.type === 'webapp'
          ? { ...widget, data: { ...widget.data, open: true } }
          : widget;
      return { ...space, widgets: { ...space.widgets, [id]: opened } };
    });
    useUiStore.getState().openPeek(id);
  },

  // The page really is closed on the way back, not merely hidden: a card left
  // marked open holds a Chromium renderer for a page nobody is looking at, and
  // twelve cards in a column is twelve of them. This is what makes the panel a
  // look rather than a second way to keep a tab open.
  closeIntoColumn: (id) =>
    updateActive(set, (space) => {
      const widget = space.widgets[id];
      if (!widget || !ownerOf(space.widgets, id)) return space;
      return { ...space, widgets: { ...space.widgets, [id]: asCard(widget) } };
    }),

  takeOutOfColumn: (id, open, at) => {
    updateActive(set, (space) => {
      const owner = ownerOf(space.widgets, id);
      if (!owner) return space;
      const data = columnData(space.widgets[owner.id]);

      const slot = data.children.indexOf(id);
      const widget = open ? asPage(space.widgets[id]) : space.widgets[id];

      // Dragged out, it stands where it was let go, centred on the pointer. It is
      // left there even if it covers something: the card came out at its full
      // widget size, which is several times a card, so it nearly always overlaps
      // and a nudge to the nearest clear spot threw it somewhere the user had
      // not pointed at.
      //
      // Taken out without a drag there is no such place, so it goes beside the
      // column it came from, level with the card it was — and that one is nudged
      // clear, or it lands under the next column along. Everything on the canvas
      // counts as taken, except the widget itself and the cards, which are drawn
      // inside their columns.
      const spot = at
        ? { x: at.x - widget.width / 2, y: at.y - HEADER_DROP_OFFSET }
        : findFreeSpot(
            { x: owner.x + owner.width + MOVE_GAP, y: owner.y + slot * COLUMN_CARD_HEIGHT },
            widget,
            Object.values(space.widgets).filter(
              (other) => other.id !== id && !ownerOf(space.widgets, other.id)
            )
          );
      const widgets = {
        ...space.widgets,
        [id]: { ...widget, ...spot, z: topZ(space) + 1 },
        [owner.id]: {
          ...space.widgets[owner.id],
          data: {
            ...data,
            children: data.children.filter((child) => child !== id),
          } as unknown as WidgetDoc['data'],
        },
      };
      return { ...space, widgets: applyColumn(widgets, owner.id) };
    });

    // A widget the app placed can land outside the view, which is the same as one
    // that never came out. A widget the user dragged is where they put it, so
    // saying anything about it would be telling them what they just did.
    const landed = get().spaces[get().activeSpaceId]?.widgets[id];
    if (landed && !at) showWhereItLanded(landed, 'Taken out of the column');
  },

  columnSlotAt: (id, at) => {
    const { spaces, activeSpaceId } = get();
    const space = spaces[activeSpaceId];
    // A column inside a column is not a thing, so a column being dragged never
    // finds a target — and neither does a card over its own column's own box
    // being the one it is leaving; that case is a reorder, handled below.
    if (!space || space.widgets[id]?.type === 'column') return null;

    const columns = Object.values(space.widgets)
      .filter((w) => w.type === 'column')
      .sort((a, b) => a.z - b.z);
    const columnId = columnAt(columns, at, [id]);
    if (!columnId) return null;

    // The list the slot is counted against leaves out the card being dragged, so
    // dropping a card back where it started is the slot it already had rather
    // than one further down.
    const children = columnData(space.widgets[columnId]).children.filter((c) => c !== id);
    return { columnId, index: dropIndex(space.widgets[columnId], children.length, at.y) };
  },

  dropIntoColumnAt: (id, columnId, index) =>
    updateActive(set, (space) => {
      const target = space.widgets[columnId];
      const widget = space.widgets[id];
      if (!target || target.type !== 'column' || !widget || widget.type === 'column') return space;

      // The card may be coming out of another column, so that one is emptied
      // first — otherwise it would be in two lists at once.
      const source = ownerOf(space.widgets, id);
      let widgets = { ...space.widgets, [id]: asCard(widget) };
      if (source && source.id !== columnId) {
        widgets[source.id] = {
          ...widgets[source.id],
          data: {
            ...columnData(widgets[source.id]),
            children: columnData(widgets[source.id]).children.filter((c) => c !== id),
          } as unknown as WidgetDoc['data'],
        };
      }

      const children = columnData(widgets[columnId]).children.filter((c) => c !== id);
      children.splice(Math.max(0, Math.min(children.length, index)), 0, id);
      widgets[columnId] = {
        ...widgets[columnId],
        data: { ...columnData(widgets[columnId]), children } as unknown as WidgetDoc['data'],
      };

      widgets = applyColumn(widgets, columnId);
      return { ...space, widgets: source ? applyColumn(widgets, source.id) : widgets };
    }),

  moveWidgetsToSpace: (ids, targetSpaceId) => {
    const { spaces, activeSpaceId } = get();
    const source = spaces[activeSpaceId];
    const target = spaces[targetSpaceId];
    if (!source || !target || targetSpaceId === activeSpaceId) return;

    // A column arrives in the new space with what it was holding.
    const moving = withChildren(source, ids)
      .map((id) => source.widgets[id])
      .filter((widget): widget is WidgetDoc => !!widget);
    if (moving.length === 0) return;

    // The group keeps its shape, but is set down clear of what the target already
    // holds — dropping it on the stored coordinates would land it on top.
    const existing = Object.values(target.widgets);
    const originX = existing.length ? Math.max(...existing.map((w) => w.x + w.width)) + MOVE_GAP : 0;
    const originY = existing.length ? Math.min(...existing.map((w) => w.y)) : 0;
    const fromX = Math.min(...moving.map((w) => w.x));
    const fromY = Math.min(...moving.map((w) => w.y));

    let z = topZ(target);
    const targetWidgets = { ...target.widgets };
    const sourceWidgets = { ...source.widgets };
    for (const widget of moving) {
      z += 1;
      targetWidgets[widget.id] = {
        ...widget,
        x: widget.x - fromX + originX,
        y: widget.y - fromY + originY,
        z,
      };
      delete sourceWidgets[widget.id];
    }

    const nextSource = { ...source, widgets: sourceWidgets };
    const nextTarget = { ...target, widgets: targetWidgets };
    scheduleSave(nextSource);
    scheduleSave(nextTarget);

    const ui = useUiStore.getState();
    // A real window cannot sit on a slot that is no longer in this space (D-072).
    for (const widget of moving) if (widget.type === 'app') ui.closeApp(widget.id);
    ui.setSelection(ui.selectedIds.filter((id) => !ids.includes(id)));

    // Browser and web app widgets read the cookie jar of the space they are in
    // (D-074), so the same page opens signed out over there. Said once, here,
    // because finding out by looking at a logged-out page reads as a bug.
    if (moving.some((widget) => widget.type === 'browser' || widget.type === 'webapp')) {
      ui.showNotice('Logins are per space, so those pages open signed out there.');
    }

    set({
      spaces: { ...spaces, [nextSource.id]: nextSource, [nextTarget.id]: nextTarget },
      lastMoved: { fromSpaceId: source.id, toSpaceId: target.id, widgets: moving },
    });
  },

  // Puts them back in the space they left, at the coordinates they had there.
  undoMove: () =>
    set((s) => {
      const moved = s.lastMoved;
      const from = moved && s.spaces[moved.fromSpaceId];
      const to = moved && s.spaces[moved.toSpaceId];
      if (!moved || !from || !to) return { lastMoved: null };

      const toWidgets = { ...to.widgets };
      const fromWidgets = { ...from.widgets };
      for (const widget of moved.widgets) {
        delete toWidgets[widget.id];
        fromWidgets[widget.id] = widget;
      }
      const nextFrom = { ...from, widgets: fromWidgets };
      const nextTo = { ...to, widgets: toWidgets };
      scheduleSave(nextFrom);
      scheduleSave(nextTo);
      return {
        lastMoved: null,
        spaces: { ...s.spaces, [nextFrom.id]: nextFrom, [nextTo.id]: nextTo },
      };
    }),

  dismissMoved: () => set({ lastMoved: null }),

  lastRemoved: null,
  lastRemovedSpace: null,
  lastMoved: null,

  // Puts it back where it was, in the space it was closed in — which may not be
  // the one on screen now.
  undoRemove: () =>
    set((s) => {
      const removed = s.lastRemoved;
      const space = removed && s.spaces[removed.spaceId];
      if (!removed || !space) return { lastRemoved: null };
      const widgets = { ...space.widgets };
      for (const widget of removed.widgets) widgets[widget.id] = widget;
      const next = { ...space, widgets };
      scheduleSave(next);
      return { lastRemoved: null, spaces: { ...s.spaces, [next.id]: next } };
    }),

  dismissRemoved: () => set({ lastRemoved: null }),
}));

// --- Selectors ---

export const useActiveSpace = () => useSpaceStore((s) => s.spaces[s.activeSpaceId]);
export const useCamera = () => useSpaceStore((s) => s.spaces[s.activeSpaceId]?.camera);
export const useWidget = (id: string) =>
  useSpaceStore((s) => s.spaces[s.activeSpaceId]?.widgets[id]);

/** Reads the active space's camera outside of React (event handlers, rAF). */
/** How far out the active space may be zoomed. The wheel needs it before it anchors a zoom, or the anchor is worked out for a zoom that never happens. */
export function getMinZoom(): number {
  const state = useSpaceStore.getState();
  const space = state.spaces[state.activeSpaceId];
  return space ? minZoomFor(Object.values(space.widgets), canvasArea()) : MIN_ZOOM;
}

export function getCamera(): Camera {
  const state = useSpaceStore.getState();
  return state.spaces[state.activeSpaceId]?.camera ?? { x: 0, y: 0, zoom: 1 };
}
