import { create } from 'zustand';
import type { AmbienceLevels } from '../ambience/engine';
import { SILENT_AMBIENCE } from '../ambience/engine';
import type { Camera } from '../canvas/camera';
import { arrange, ArrangeMode, fitCamera } from '../canvas/layout';
import { useAppTimeStore } from './appTimeStore';
import { useSpaceTimeStore } from './spaceTimeStore';
import { canvasArea, useUiStore } from './uiStore';
import { migrateLegacySpaces, migrateSpace } from '../spaces/migrate';
import { ParticlesChoice, SCHEMA_VERSION, SpaceDoc, WidgetDoc, WidgetType } from '../spaces/types';
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
  bringToFront: (id: string) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  /** Moves a whole selection by one delta, so the group keeps its shape. */
  moveWidgets: (ids: string[], dx: number, dy: number) => void;
  resizeWidget: (id: string, width: number, height: number) => void;
  updateWidgetData: (id: string, patch: Record<string, unknown>) => void;
  removeWidget: (id: string) => void;
  /** Closes a whole selection at once, so one undo brings all of it back. */
  removeWidgets: (ids: string[]) => void;
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
  return selected.length ? selected.map((id) => space.widgets[id]) : Object.values(space.widgets);
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

function topZ(space: SpaceDoc) {
  return Object.values(space.widgets).reduce((max, w) => Math.max(max, w.z), 0);
}

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
    for (const doc of docs) spaces[doc.id] = migrateSpace(doc);

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

  setCamera: (camera) => updateActive(set, (space) => ({ ...space, camera })),

  // Choosing a theme drops what the user had layered on top of the old one — the
  // wallpaper would keep the new scene hidden, and the weather would keep raining
  // in a room that no longer has that sky.
  setTheme: (themeId) =>
    updateActive(set, (space) => ({ ...space, themeId, background: null, particles: null })),

  setBackground: (background) => updateActive(set, (space) => ({ ...space, background })),

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
      const ordered = [...boxes].sort((a, b) => b.z - a.z);
      const placements = arrange(ordered, area, mode, columns);
      const widgets = { ...space.widgets };
      for (const [id, place] of Object.entries(placements)) {
        widgets[id] = {
          ...widgets[id],
          x: place.x + anchor.x,
          y: place.y + anchor.y,
          width: place.width,
          height: place.height,
        };
      }
      const camera = fitCamera(inPlay({ ...space, widgets }), area);
      return { ...space, widgets, camera: camera ?? space.camera };
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
      const widgets = { ...space.widgets };
      let z = topZ(space);
      const copies: string[] = [];

      for (const id of ids) {
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
      }

      // Copying a group leaves the group picked out — otherwise the next drag
      // moves the originals, which is not what was just asked for.
      if (useUiStore.getState().selectedIds.length > 1) {
        useUiStore.getState().setSelection(copies);
      }
      return { ...space, widgets };
    }),

  bringToFront: (id) =>
    updateActive(set, (space) => {
      const widget = space.widgets[id];
      if (!widget || widget.z === topZ(space)) return space;
      return { ...space, widgets: { ...space.widgets, [id]: { ...widget, z: topZ(space) + 1 } } };
    }),

  moveWidget: (id, x, y) =>
    updateActive(set, (space) => ({
      ...space,
      widgets: { ...space.widgets, [id]: { ...space.widgets[id], x, y } },
    })),

  moveWidgets: (ids, dx, dy) =>
    updateActive(set, (space) => {
      const widgets = { ...space.widgets };
      for (const id of ids) {
        const widget = widgets[id];
        if (widget) widgets[id] = { ...widget, x: widget.x + dx, y: widget.y + dy };
      }
      return { ...space, widgets };
    }),

  resizeWidget: (id, width, height) =>
    updateActive(set, (space) => ({
      ...space,
      widgets: {
        ...space.widgets,
        [id]: {
          ...space.widgets[id],
          width: Math.max(MIN_WIDGET_SIZE, width),
          height: Math.max(MIN_WIDGET_SIZE, height),
        },
      },
    })),

  updateWidgetData: (id, patch) =>
    updateActive(set, (space) => ({
      ...space,
      widgets: {
        ...space.widgets,
        [id]: { ...space.widgets[id], data: { ...space.widgets[id].data, ...patch } },
      },
    })),

  removeWidget: (id) => get().removeWidgets([id]),

  removeWidgets: (ids) => {
    const ui = useUiStore.getState();
    ui.setSelection(ui.selectedIds.filter((selected) => !ids.includes(selected)));
    const { spaces, activeSpaceId } = get();
    const closed = ids
      .map((id) => spaces[activeSpaceId]?.widgets[id])
      .filter((widget): widget is WidgetDoc => !!widget);
    if (closed.length === 0) return;
    set({ lastRemoved: { spaceId: activeSpaceId, widgets: closed } });
    updateActive(set, (space) => {
      const widgets = { ...space.widgets };
      for (const id of ids) delete widgets[id];
      return { ...space, widgets };
    });
  },

  moveWidgetsToSpace: (ids, targetSpaceId) => {
    const { spaces, activeSpaceId } = get();
    const source = spaces[activeSpaceId];
    const target = spaces[targetSpaceId];
    if (!source || !target || targetSpaceId === activeSpaceId) return;

    const moving = ids
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
export function getCamera(): Camera {
  const state = useSpaceStore.getState();
  return state.spaces[state.activeSpaceId]?.camera ?? { x: 0, y: 0, zoom: 1 };
}
