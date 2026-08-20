import { create } from 'zustand';
import type { AmbienceLevels } from '../ambience/engine';
import { SILENT_AMBIENCE } from '../ambience/engine';
import type { Camera } from '../canvas/camera';
import { arrange, ArrangeMode, fitCamera } from '../canvas/layout';
import { useAppTimeStore } from './appTimeStore';
import { useSpaceTimeStore } from './spaceTimeStore';
import { canvasArea, useUiStore } from './uiStore';
import { migrateLegacySpaces, migrateSpace } from '../spaces/migrate';
import { SCHEMA_VERSION, SpaceDoc, WidgetDoc, WidgetType } from '../spaces/types';
import { DEFAULT_THEME_ID } from '../themes/themes';
import { WIDGET_DEFS } from '../widgets/defs';

const ACTIVE_SPACE_KEY = 'active-space-id';
const LEGACY_SPACES_KEY = 'focus-window-spaces-v13';
const SAVE_DEBOUNCE_MS = 500;
const MIN_WIDGET_SIZE = 140;

interface SpaceState {
  spaces: Record<string, SpaceDoc>;
  activeSpaceId: string;
  isLoaded: boolean;

  load: () => Promise<void>;
  addSpace: (name: string) => void;
  removeSpace: (id: string) => void;
  setActiveSpace: (id: string) => void;

  setCamera: (camera: Camera) => void;
  setTheme: (themeId: string) => void;
  setBackground: (background: SpaceDoc['background']) => void;
  setAmbience: (ambience: AmbienceLevels) => void;
  arrangeWidgets: (mode?: ArrangeMode, columns?: number) => void;
  fitToWidgets: () => void;
  /** `at` is a world point the widget is centred on — where the palette icon was dropped. */
  addWidget: (
    type: WidgetType,
    data?: Record<string, unknown>,
    at?: { x: number; y: number }
  ) => void;
  bringToFront: (id: string) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  /** Moves a whole selection by one delta, so the group keeps its shape. */
  moveWidgets: (ids: string[], dx: number, dy: number) => void;
  resizeWidget: (id: string, width: number, height: number) => void;
  updateWidgetData: (id: string, patch: Record<string, unknown>) => void;
  removeWidget: (id: string) => void;
  /** The last widget closed, kept so the toast can put it back. */
  lastRemoved: { spaceId: string; widget: WidgetDoc } | null;
  undoRemove: () => void;
  dismissRemoved: () => void;
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

function newSpace(name: string): SpaceDoc {
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

function defaultSpace(): SpaceDoc {
  const space = newSpace('Home');
  const memo: WidgetDoc = {
    id: crypto.randomUUID(),
    type: 'memo',
    x: 0,
    y: 0,
    z: 1,
    ...WIDGET_DEFS.memo.defaultSize,
    data: WIDGET_DEFS.memo.createData(),
  };
  const timer: WidgetDoc = {
    id: crypto.randomUUID(),
    x: 420,
    y: 0,
    z: 2,
    type: 'timer',
    ...WIDGET_DEFS.timer.defaultSize,
    data: WIDGET_DEFS.timer.createData(),
  };
  space.widgets = { [memo.id]: memo, [timer.id]: timer };
  return space;
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

export const useSpaceStore = create<SpaceState>((set, get) => ({
  spaces: {},
  activeSpaceId: '',
  isLoaded: false,

  load: async () => {
    let docs: SpaceDoc[] = ((await window.spaces?.list()) ?? []) as SpaceDoc[];

    if (docs.length === 0) {
      // First run on this machine: adopt the pre-rewrite MVP data if it is there.
      const legacy = await window.store?.get(LEGACY_SPACES_KEY);
      docs = migrateLegacySpaces(legacy);
      if (docs.length === 0) docs = [defaultSpace()];
      for (const doc of docs) void window.spaces?.save(doc);
    }

    const spaces: Record<string, SpaceDoc> = {};
    for (const doc of docs) spaces[doc.id] = migrateSpace(doc);

    const savedId = (await window.store?.get(ACTIVE_SPACE_KEY)) as string | undefined;
    const activeSpaceId = savedId && spaces[savedId] ? savedId : docs[0].id;

    set({ spaces, activeSpaceId, isLoaded: true });
  },

  addSpace: (name) => {
    const space = newSpace(name.trim() || 'Untitled');
    void window.spaces?.save(space);
    void window.store?.set(ACTIVE_SPACE_KEY, space.id);
    set((state) => ({
      spaces: { ...state.spaces, [space.id]: space },
      activeSpaceId: space.id,
    }));
  },

  removeSpace: (id) => {
    const { spaces, activeSpaceId } = get();
    const remaining = Object.keys(spaces).filter((sid) => sid !== id);
    if (remaining.length === 0) return; // Never leave the app with no space.

    void window.spaces?.delete(id);
    // Its logged time goes with it, rather than lingering as a nameless row.
    useSpaceTimeStore.getState().forget(id);
    useAppTimeStore.getState().forget(id);
    const nextSpaces = { ...spaces };
    delete nextSpaces[id];
    const nextActive = activeSpaceId === id ? remaining[0] : activeSpaceId;
    if (nextActive !== activeSpaceId) void window.store?.set(ACTIVE_SPACE_KEY, nextActive);
    set({ spaces: nextSpaces, activeSpaceId: nextActive });
  },

  setActiveSpace: (id) => {
    void window.store?.set(ACTIVE_SPACE_KEY, id);
    set({ activeSpaceId: id });
  },

  setCamera: (camera) => updateActive(set, (space) => ({ ...space, camera })),

  // Choosing a theme drops any wallpaper the user had layered on top of the old one,
  // otherwise the new theme's scene would stay hidden behind it.
  setTheme: (themeId) => updateActive(set, (space) => ({ ...space, themeId, background: null })),

  setBackground: (background) => updateActive(set, (space) => ({ ...space, background })),

  setAmbience: (ambience) => updateActive(set, (space) => ({ ...space, ambience })),

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
      const placements = arrange(boxes, area, mode, columns);
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
      return { ...space, widgets: { ...space.widgets, [widget.id]: widget } };
    });
  },

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

  removeWidget: (id) => {
    const ui = useUiStore.getState();
    ui.setSelection(ui.selectedIds.filter((selected) => selected !== id));
    const { spaces, activeSpaceId } = get();
    const widget = spaces[activeSpaceId]?.widgets[id];
    if (widget) set({ lastRemoved: { spaceId: activeSpaceId, widget } });
    updateActive(set, (space) => {
      const widgets = { ...space.widgets };
      delete widgets[id];
      return { ...space, widgets };
    });
  },

  lastRemoved: null,

  // Puts it back where it was, in the space it was closed in — which may not be
  // the one on screen now.
  undoRemove: () =>
    set((s) => {
      const removed = s.lastRemoved;
      const space = removed && s.spaces[removed.spaceId];
      if (!removed || !space) return { lastRemoved: null };
      const next = {
        ...space,
        widgets: { ...space.widgets, [removed.widget.id]: removed.widget },
      };
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
