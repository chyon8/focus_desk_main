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

export interface Notice {
  /** Changes on every notice, so the toast restarts its countdown. */
  id: number;
  label: string;
  action?: { label: string; run: () => void };
  /**
   * Stays up until the user closes it. For a line that teaches a shortcut: one
   * that times out is one the reader has to have been looking at.
   */
  sticky?: boolean;
}

interface UiState {
  isSidebarOpen: boolean;
  // Widget blown up to fill the canvas. Purely a view state: the widget keeps its
  // stored position and size, so leaving maximised puts it back untouched.
  maximizedWidgetId: string | null;
  /**
   * A card in a column, opened where it stands.
   *
   * A card is a picture of a page, and a picture is not something you can read —
   * so a click has to show the real thing. Filling the screen for that is too
   * much: the click was "what is this", not "I am working in here now", and
   * coming back meant finding the way out of a full-screen page. So it opens as
   * a panel beside its column and closes again on the next click elsewhere,
   * leaving the column exactly as it was.
   */
  peekWidgetId: string | null;
  /**
   * Where a widget being dragged right now would land if it were let go: which
   * column, and which slot down it.
   *
   * It is here rather than in the drag itself because the column has to draw the
   * line and the drag is happening somewhere else — over the canvas, or over
   * another column. Null while nothing is being dragged, and while a drag is out
   * in the open where letting go means leaving the column.
   */
  dropTarget: { columnId: string; index: number } | null;
  /** The widget being dragged right now, so it can step out of the way of what it is being dropped on. */
  draggingWidgetId: string | null;
  /**
   * Where a card being dragged into the open would stand, in world coordinates.
   * A card comes out at its full widget size, which is several times the card
   * under the pointer, so without an outline there is no telling what is about
   * to be covered. Null while the drag is over a column — the column draws its
   * own line — and while nothing is being dragged.
   */
  dropSpot: { x: number; y: number; width: number; height: number } | null;
  /** Widgets picked out with ⇧-drag or ⌥-click: move, arrange and fit act on these alone. */
  selectedIds: string[];
  /** ⌥ is down, so hovering a widget shows it can be picked. */
  isAltHeld: boolean;
  /**
   * The widget last used, marked with a ring. With a dozen browser widgets open
   * the one you just came back from is otherwise impossible to find again.
   */
  lastActiveId: string | null;
  /**
   * The "move to space" list on the selection bar. In the store rather than the
   * bar because a widget's own header opens it too, by picking that widget out.
   */
  isMoveMenuOpen: boolean;
  /**
   * The quick-add palette, open at a point: `screen` places the popover in window
   * coordinates, `world` is where the chosen widget lands. Null when closed.
   */
  quickAdd: { screen: Point; world: Point } | null;
  /**
   * Which of the two top-bar panels is open, if either. In the store because the
   * button that opens one is not always in the same component as the panel: a
   * maximised widget's header takes over the top bar and puts its own there.
   */
  openDock: 'ambience' | 'theme' | null;
  /** Search across everything openable (K). */
  isLauncherOpen: boolean;
  /** The keyboard cheatsheet. */
  isShortcutsOpen: boolean;
  /**
   * A one-line report of something the app did on its own, with an optional way
   * to go and look at it. Nothing here is a question — it is for work that
   * happened off-screen, where silence reads as nothing having happened.
   */
  notice: Notice | null;
  /** The window covers the screen (⇧M, or the sidebar button). */
  isFullscreen: boolean;
  /**
   * App widgets the user has opened: their real windows sit on them whenever the
   * widget is fully on the canvas. Not persisted — real windows do not survive a
   * restart either.
   */
  openAppIds: string[];
  /**
   * Whether the real windows are on their slots (D-071). Two states, and only
   * ⌃⌥D moves between them: the desk cannot be above the app windows and
   * below them at once, so the one thing that must never happen is the choice
   * being made by an ordinary click.
   */
  isStaged: boolean;

  setSidebarOpen: (open: boolean) => void;
  setSelection: (ids: string[]) => void;
  toggleSelected: (widgetId: string) => void;
  clearSelection: () => void;
  setAltHeld: (held: boolean) => void;
  noteActive: (widgetId: string) => void;
  openMoveMenu: (widgetIds?: string[]) => void;
  closeMoveMenu: () => void;
  toggleMaximized: (widgetId: string) => void;
  clearMaximized: () => void;
  /** Opens a card where it stands. Replaces whatever was open before. */
  openPeek: (widgetId: string) => void;
  closePeek: () => void;
  setDropTarget: (target: { columnId: string; index: number } | null) => void;
  setDropSpot: (spot: { x: number; y: number; width: number; height: number } | null) => void;
  setDraggingWidget: (widgetId: string | null) => void;
  toggleDock: (dock: 'ambience' | 'theme') => void;
  closeDock: () => void;
  openQuickAdd: (screen: Point, world: Point) => void;
  closeQuickAdd: () => void;
  toggleLauncher: () => void;
  closeLauncher: () => void;
  toggleShortcuts: () => void;
  showNotice: (label: string, action?: Notice['action'], sticky?: boolean) => void;
  dismissNotice: () => void;
  toggleFullscreen: () => void;
  setStaged: (staged: boolean) => void;
  toggleAppOpen: (widgetId: string) => void;
  closeApp: (widgetId: string) => void;
  closeAllApps: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  maximizedWidgetId: null,
  peekWidgetId: null,
  dropTarget: null,
  draggingWidgetId: null,
  dropSpot: null,
  selectedIds: [],
  isAltHeld: false,
  lastActiveId: null,
  isMoveMenuOpen: false,
  quickAdd: null,
  openDock: null,
  isLauncherOpen: false,
  isShortcutsOpen: false,
  notice: null,
  isFullscreen: false,
  openAppIds: [],
  // Nothing is placed yet, so the desk is simply a window like any other.
  isStaged: false,

  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  setSelection: (selectedIds) => set({ selectedIds }),

  toggleSelected: (widgetId) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(widgetId)
        ? s.selectedIds.filter((id) => id !== widgetId)
        : [...s.selectedIds, widgetId],
    })),

  clearSelection: () => set({ selectedIds: [], isMoveMenuOpen: false }),

  setAltHeld: (isAltHeld) => set({ isAltHeld }),

  noteActive: (lastActiveId) => set({ lastActiveId }),

  // Given ids, those become the selection: the menu acts on what is picked, and a
  // widget's own header asks for that one widget.
  openMoveMenu: (widgetIds) =>
    set((s) => ({ selectedIds: widgetIds ?? s.selectedIds, isMoveMenuOpen: true })),

  closeMoveMenu: () => set({ isMoveMenuOpen: false }),

  // Maximising leaves the peek: the two are the same widget being looked at, and
  // a panel left open behind a full-screen page has nothing to sit beside.
  toggleMaximized: (widgetId) =>
    set((s) => ({
      maximizedWidgetId: s.maximizedWidgetId === widgetId ? null : widgetId,
      peekWidgetId: null,
    })),

  clearMaximized: () => set({ maximizedWidgetId: null, openDock: null }),

  // Clearing the maximised widget is not tidying: a panel is drawn beside the
  // column it came from, and a maximised widget covers the whole canvas
  // including that column. Leaving both set drew the blocking layer the panel
  // sits on with no panel on it — an invisible sheet over the canvas.
  openPeek: (peekWidgetId) =>
    set({ peekWidgetId, maximizedWidgetId: null, selectedIds: [] }),
  closePeek: () => set({ peekWidgetId: null }),

  setDropTarget: (dropTarget) => set({ dropTarget }),
  setDraggingWidget: (draggingWidgetId) => set({ draggingWidgetId }),
  setDropSpot: (dropSpot) => set({ dropSpot }),

  toggleDock: (dock) => set((s) => ({ openDock: s.openDock === dock ? null : dock })),
  closeDock: () => set({ openDock: null }),

  openQuickAdd: (screen, world) => set({ quickAdd: { screen, world } }),

  closeQuickAdd: () => set({ quickAdd: null }),

  toggleLauncher: () => set((s) => ({ isLauncherOpen: !s.isLauncherOpen, quickAdd: null })),
  closeLauncher: () => set({ isLauncherOpen: false }),
  toggleShortcuts: () => set((s) => ({ isShortcutsOpen: !s.isShortcutsOpen })),

  showNotice: (label, action, sticky) =>
    set((s) => ({ notice: { id: (s.notice?.id ?? 0) + 1, label, action, sticky } })),
  dismissNotice: () => set({ notice: null }),

  // The main process owns the real state and hands it back; the flag here is only
  // so the button can show which way it goes next.
  toggleFullscreen: () => {
    void window.windowMode?.toggleFullscreen().then((on) => set({ isFullscreen: on }));
  },

  setStaged: (isStaged) => set({ isStaged }),

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
