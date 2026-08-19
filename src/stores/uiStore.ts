import { create } from 'zustand';

export const SIDEBAR_WIDTH = 256;
// Titlebar drag strip plus the row of floating buttons under it.
const TOP_CHROME_HEIGHT = 84;

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
  /** The widget last clicked — what Esc closes. */
  focusedWidgetId: string | null;

  setSidebarOpen: (open: boolean) => void;
  setFocusedWidget: (widgetId: string | null) => void;
  toggleMaximized: (widgetId: string) => void;
  clearMaximized: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  maximizedWidgetId: null,
  focusedWidgetId: null,

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  setFocusedWidget: (focusedWidgetId) => set({ focusedWidgetId }),

  toggleMaximized: (widgetId) =>
    set((s) => ({ maximizedWidgetId: s.maximizedWidgetId === widgetId ? null : widgetId })),

  clearMaximized: () => set({ maximizedWidgetId: null }),
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
