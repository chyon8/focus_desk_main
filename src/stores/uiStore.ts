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

  enterMini: (widgetId: string) => void;
  exitMini: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  miniWidgetId: null,
  isSidebarOpen: true,

  enterMini: (widgetId) => {
    void window.windowMode?.setMini(true);
    set({ miniWidgetId: widgetId });
  },

  exitMini: () => {
    void window.windowMode?.setMini(false);
    set({ miniWidgetId: null });
  },

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
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
