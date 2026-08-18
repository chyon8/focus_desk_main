import { create } from 'zustand';
import type { AmbienceLevels } from '../ambience/engine';
import { SILENT_AMBIENCE } from '../ambience/engine';
import type { Camera } from '../canvas/camera';
import { arrange, ArrangeMode, fitCamera } from '../canvas/layout';
import { useAppTimeStore } from './appTimeStore';
import { useSpaceTimeStore } from './spaceTimeStore';
import { canvasArea } from './uiStore';
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
  addWidget: (type: WidgetType, data?: Record<string, unknown>) => void;
  bringToFront: (id: string) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, width: number, height: number) => void;
  updateWidgetData: (id: string, patch: Record<string, unknown>) => void;
  removeWidget: (id: string) => void;
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

  // Tidy every widget, then frame the result so the user sees it.
  arrangeWidgets: (mode = 'grid', columns) =>
    updateActive(set, (space) => {
      const boxes = Object.values(space.widgets);
      if (boxes.length === 0) return space;

      const positions = arrange(boxes, mode, columns);
      const widgets = { ...space.widgets };
      for (const [id, pos] of Object.entries(positions)) {
        widgets[id] = { ...widgets[id], ...pos };
      }
      const area = canvasArea();
      const camera = fitCamera(Object.values(widgets), area);
      return { ...space, widgets, camera: camera ?? space.camera };
    }),

  fitToWidgets: () =>
    updateActive(set, (space) => {
      const area = canvasArea();
      const camera = fitCamera(Object.values(space.widgets), area);
      return camera ? { ...space, camera } : space;
    }),

  addWidget: (type, data) => {
    const def = WIDGET_DEFS[type];
    updateActive(set, (space) => {
      // Drop it in the middle of the canvas area the user is looking at.
      const area = canvasArea();
      const widget: WidgetDoc = {
        id: crypto.randomUUID(),
        type,
        x: space.camera.x + (area.width / space.camera.zoom - def.defaultSize.width) / 2,
        y:
          space.camera.y +
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

  removeWidget: (id) =>
    updateActive(set, (space) => {
      const widgets = { ...space.widgets };
      delete widgets[id];
      return { ...space, widgets };
    }),
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
