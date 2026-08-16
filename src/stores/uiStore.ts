import { create } from 'zustand';

export const SIDEBAR_WIDTH = 256;
const CONTROL_BAR_HEIGHT = 76;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UiState {
  // Widget shown alone in the floating mini window; null means normal canvas.
  miniWidgetId: string | null;
  isSidebarOpen: boolean;
  // Widget blown up to fill the canvas. Purely a view state: the widget keeps its
  // stored position and size, so leaving maximised puts it back untouched.
  maximizedWidgetId: string | null;

  enterMini: (widgetId: string) => void;
  exitMini: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleMaximized: (widgetId: string) => void;
  clearMaximized: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  miniWidgetId: null,
  isSidebarOpen: true,
  maximizedWidgetId: null,

  enterMini: (widgetId) => {
    void window.windowMode?.setMini(true);
    set({ miniWidgetId: widgetId });
  },

  exitMini: () => {
    void window.windowMode?.setMini(false);
    set({ miniWidgetId: null });
  },

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  toggleMaximized: (widgetId) =>
    set((s) => ({ maximizedWidgetId: s.maximizedWidgetId === widgetId ? null : widgetId })),

  clearMaximized: () => set({ maximizedWidgetId: null }),
}));

/**
 * The part of the window the canvas owns, in window coordinates. Chrome (sidebar,
 * control bar) sits outside it, so arranging and fitting never park a widget
 * underneath it.
 */
export function canvasArea(): Rect {
  const left = useUiStore.getState().isSidebarOpen ? SIDEBAR_WIDTH : 0;
  return {
    x: left,
    y: 0,
    width: Math.max(1, window.innerWidth - left),
    height: Math.max(1, window.innerHeight - CONTROL_BAR_HEIGHT),
  };
}
