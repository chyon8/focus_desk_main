import { create } from 'zustand';

export const SIDEBAR_WIDTH = 256;
// Titlebar drag strip plus the row of floating buttons under it.
const TOP_CHROME_HEIGHT = 84;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UiState {
  isSidebarOpen: boolean;
  // Widget blown up to fill the canvas. Purely a view state: the widget keeps its
  // stored position and size, so leaving maximised puts it back untouched.
  maximizedWidgetId: string | null;
  /** Widgets picked out with ⇧-drag or ⌥-click: move, arrange and fit act on these alone. */
  selectedIds: string[];
  /** ⌥ is down, so hovering a widget shows it can be picked. */
  isAltHeld: boolean;
  /**
   * The quick-add palette, open at a point: `screen` places the popover in window
   * coordinates, `world` is where the chosen widget lands. Null when closed.
   */
  quickAdd: { screen: Point; world: Point } | null;
  /** The keyboard cheatsheet. */
  isShortcutsOpen: boolean;
  /**
   * App widgets the user has opened: their real windows sit on them whenever the
   * widget is fully on the canvas. Not persisted — real windows do not survive a
   * restart either.
   */
  openAppIds: string[];

  setSidebarOpen: (open: boolean) => void;
  setSelection: (ids: string[]) => void;
  toggleSelected: (widgetId: string) => void;
  clearSelection: () => void;
  setAltHeld: (held: boolean) => void;
  toggleMaximized: (widgetId: string) => void;
  clearMaximized: () => void;
  openQuickAdd: (screen: Point, world: Point) => void;
  closeQuickAdd: () => void;
  toggleShortcuts: () => void;
  toggleAppOpen: (widgetId: string) => void;
  closeApp: (widgetId: string) => void;
  closeAllApps: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  maximizedWidgetId: null,
  selectedIds: [],
  isAltHeld: false,
  quickAdd: null,
  isShortcutsOpen: false,
  openAppIds: [],

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  setSelection: (selectedIds) => set({ selectedIds }),

  toggleSelected: (widgetId) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(widgetId)
        ? s.selectedIds.filter((id) => id !== widgetId)
        : [...s.selectedIds, widgetId],
    })),

  clearSelection: () => set({ selectedIds: [] }),

  setAltHeld: (isAltHeld) => set({ isAltHeld }),

  toggleMaximized: (widgetId) =>
    set((s) => ({ maximizedWidgetId: s.maximizedWidgetId === widgetId ? null : widgetId })),

  clearMaximized: () => set({ maximizedWidgetId: null }),

  openQuickAdd: (screen, world) => set({ quickAdd: { screen, world } }),

  closeQuickAdd: () => set({ quickAdd: null }),

  toggleShortcuts: () => set((s) => ({ isShortcutsOpen: !s.isShortcutsOpen })),

  toggleAppOpen: (widgetId) =>
    set((s) => ({
      openAppIds: s.openAppIds.includes(widgetId)
        ? s.openAppIds.filter((id) => id !== widgetId)
        : [...s.openAppIds, widgetId],
    })),

  closeApp: (widgetId) =>
    set((s) => ({ openAppIds: s.openAppIds.filter((id) => id !== widgetId) })),

  closeAllApps: () => set({ openAppIds: [] }),
}));

/**
 * The part of the window the canvas owns, in window coordinates. Chrome (sidebar,
 * top strip) sits outside it, so arranging and fitting never park a widget
 * underneath it — the top strip in particular used to clip the first row.
 */
export function canvasArea(): Rect {
  const left = useUiStore.getState().isSidebarOpen ? SIDEBAR_WIDTH : 0;
  return {
    x: left,
    y: TOP_CHROME_HEIGHT,
    width: Math.max(1, window.innerWidth - left),
    height: Math.max(1, window.innerHeight - TOP_CHROME_HEIGHT),
  };
}
