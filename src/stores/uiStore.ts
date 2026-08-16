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
  /**
   * Extra height reserved above the control bar while a popover is open.
   * Native browser views paint above all HTML and ignore z-index, so a view
   * reaching into this strip hides itself and shows its snapshot instead.
   */
  bottomOverlayHeight: number;

  enterMini: (widgetId: string) => void;
  exitMini: () => void;
  setSidebarOpen: (open: boolean) => void;
  setBottomOverlayHeight: (height: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  miniWidgetId: null,
  isSidebarOpen: true,
  bottomOverlayHeight: 0,

  enterMini: (widgetId) => {
    void window.windowMode?.setMini(true);
    set({ miniWidgetId: widgetId });
  },

  exitMini: () => {
    void window.windowMode?.setMini(false);
    set({ miniWidgetId: null });
  },

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  setBottomOverlayHeight: (bottomOverlayHeight) => set({ bottomOverlayHeight }),
}));

/**
 * The part of the window the canvas owns, in window coordinates. Chrome (sidebar,
 * control bar, open popovers) sits outside it; a native browser view that reaches
 * into that chrome steps aside rather than covering it.
 */
export function canvasArea(): Rect {
  const { isSidebarOpen, bottomOverlayHeight } = useUiStore.getState();
  const left = isSidebarOpen ? SIDEBAR_WIDTH : 0;
  return {
    x: left,
    y: 0,
    width: Math.max(1, window.innerWidth - left),
    height: Math.max(1, window.innerHeight - CONTROL_BAR_HEIGHT - bottomOverlayHeight),
  };
}
