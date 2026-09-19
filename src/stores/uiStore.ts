import { create } from 'zustand';

/** The rail floats clear of the window on all four sides. */
export const RAIL_INSET = 14;
/**
 * Where the rail starts.
 *
 * macOS draws its window buttons at 10,10 and they are 52px wide, so at the
 * rail's 14px inset they would sit inside it and neither could be pressed. The
 * rail starts under them instead.
 */
export const RAIL_TOP = 44;
/** What the rail takes out of the canvas: its inset, its width, and a gap. */
export const RAIL_WIDTH = RAIL_INSET + 60 + RAIL_INSET;
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
   * 최대화한 브라우저의 상단바 두 개(위젯 헤더·주소줄)가 나와 있다.
   *
   * 그 둘은 서로 다른 컴포넌트가 그리는데 한 덩어리로 같이 나오고 들어가야 해서
   * 여기 있다. 최대화한 브라우저는 한 번에 하나뿐이라 불리언이면 된다.
   */
  isTopBarsOut: boolean;
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
   * The "move to space" list on the selection bar. In the store rather than the
   * bar because a widget's own header opens it too, by picking that widget out.
   */
  isMoveMenuOpen: boolean;
  /**
   * The quick-add palette, open at a point: `screen` places the popover in window
   * coordinates, `world` is where the chosen widget lands. Null when closed.
   */
  quickAdd: { screen: Point; world: Point; teaches?: boolean } | null;
  /**
   * Which of the two top-bar panels is open, if either. In the store because the
   * button that opens one is not always in the same component as the panel: a
   * maximised widget's header takes over the top bar and puts its own there.
   */
  /** 레일에서 여는 패널. 한 번에 하나만 뜬다. */
  openDock: 'atmosphere' | 'sound' | null;
  /**
   * 그 패널을 연 레일 버튼의 화면 y. 패널이 누른 자리 옆에 뜬다 — 레일 맨 아래
   * 버튼을 눌렀는데 패널이 맨 위에 뜨면 손이 화면을 세로로 가로지른다.
   */
  dockTop: number | null;
  /**
   * The sign-ins panel. In the store because three places open it — settings,
   * a widget's address row and its right-click menu — and only one of them is
   * near the rail that draws it.
   */
  isSignInsOpen: boolean;
  /**
   * The favorites panel. Same reason as the sign-ins one: settings opens it, and
   * so does the favourite picker inside a widget, which is nowhere near the rail.
   */
  isFavoritesOpen: boolean;
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
  /**
   * The move the first run is waiting for the user to make, if it is still
   * waiting. Two of them, one at a time: bringing a widget out, then tidying up.
   * Neither is written anywhere on screen, and the sidebar palette that used to
   * show the first one is gone.
   *
   * Not stored. It belongs to the run that finished the first-run screen — a
   * line that came back on the third launch is nagging, and by then the user has
   * either found the move or does not want it.
   */
  firstStep: 'add' | 'tidy' | 'drag' | 'done' | null;
  /**
   * The sample page the third move is practised on, while it is standing. Held
   * here so the step that made it is the step that takes it away.
   */
  firstStepSampleId: string | null;
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
  toggleDock: (dock: 'atmosphere' | 'sound', top?: number) => void;
  setSignInsOpen: (isSignInsOpen: boolean) => void;
  setFavoritesOpen: (isFavoritesOpen: boolean) => void;
  closeDock: () => void;
  openQuickAdd: (screen: Point, world: Point, teaches?: boolean) => void;
  closeQuickAdd: () => void;
  toggleLauncher: () => void;
  closeLauncher: () => void;
  toggleShortcuts: () => void;
  showNotice: (label: string, action?: Notice['action'], sticky?: boolean) => void;
  dismissNotice: () => void;
  /** Starts the two moves, once the first run has settled into the space. */
  startFirstSteps: (spaceName: string) => void;
  /** The user made the move: on to the next one, or done. */
  passFirstStep: (step: 'add' | 'tidy' | 'drag') => void;
  setFirstStepSample: (id: string | null) => void;
  /** Closed by hand, or the last word has been read. */
  endFirstSteps: () => void;
  /** The space's name, for the first line. Only set while the steps are running. */
  firstStepSpace: string;
  toggleFullscreen: () => void;
  showTopBars: () => void;
  hideTopBars: () => void;
  setStaged: (staged: boolean) => void;
  toggleAppOpen: (widgetId: string) => void;
  closeApp: (widgetId: string) => void;
  closeAllApps: () => void;
}

/** `showTopBars`가 건 시계. 최대화한 브라우저는 하나뿐이라 모듈에 하나면 된다. */
let topBarsTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set, get) => ({
  isSidebarOpen: true,
  maximizedWidgetId: null,
  peekWidgetId: null,
  isTopBarsOut: false,
  dropTarget: null,
  draggingWidgetId: null,
  dropSpot: null,
  selectedIds: [],
  isAltHeld: false,
  isMoveMenuOpen: false,
  quickAdd: null,
  firstStep: null,
  firstStepSpace: '',
  firstStepSampleId: null,
  openDock: null,
  isSignInsOpen: false,
  isFavoritesOpen: false,
  dockTop: null,
  isLauncherOpen: false,
  isShortcutsOpen: false,
  notice: null,
  isFullscreen: false,
  openAppIds: [],
  // Nothing is placed yet, so the desk is simply a window like any other.
  isStaged: false,

  // 레일을 접으면 열려 있던 Atmosphere·Sound도 닫는다. 둘 다 레일 옆에 서고
  // 입구가 레일 버튼뿐이라, 남겨두면 끌 수 없는 패널이 뜬 채로 남는다.
  setSidebarOpen: (isSidebarOpen) =>
    set(isSidebarOpen ? { isSidebarOpen } : { isSidebarOpen, openDock: null }),

  setSelection: (selectedIds) => set({ selectedIds }),

  toggleSelected: (widgetId) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(widgetId)
        ? s.selectedIds.filter((id) => id !== widgetId)
        : [...s.selectedIds, widgetId],
    })),

  clearSelection: () => set({ selectedIds: [], isMoveMenuOpen: false }),

  setAltHeld: (isAltHeld) => set({ isAltHeld }),

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
      isTopBarsOut: false,
    })),

  clearMaximized: () => set({ maximizedWidgetId: null, openDock: null, isTopBarsOut: false }),

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

  toggleDock: (dock, top) =>
    set((s) => ({ openDock: s.openDock === dock ? null : dock, dockTop: top ?? null })),
  closeDock: () => set({ openDock: null }),

  setSignInsOpen: (isSignInsOpen) => set({ isSignInsOpen }),
  setFavoritesOpen: (isFavoritesOpen) => set({ isFavoritesOpen }),

  openQuickAdd: (screen, world, teaches) => set({ quickAdd: { screen, world, teaches } }),

  // 투어의 1단계는 팔레트가 닫힐 때 끝난다 — 위젯을 골랐든 빈 곳을 눌러 접었든.
  // 더블클릭한 순간에 넘기면 팔레트가 아직 열려 있는데 다음 카드가 뜬다: 방금
  // 시킨 일이 안 끝났는데 화면은 다음 얘기를 하고 있다.
  closeQuickAdd: () => {
    if (get().quickAdd?.teaches) get().passFirstStep('add');
    set({ quickAdd: null });
  },

  toggleLauncher: () => {
    get().closeQuickAdd();
    set((s) => ({ isLauncherOpen: !s.isLauncherOpen }));
  },
  closeLauncher: () => set({ isLauncherOpen: false }),
  toggleShortcuts: () => set((s) => ({ isShortcutsOpen: !s.isShortcutsOpen })),

  showNotice: (label, action, sticky) =>
    set((s) => ({ notice: { id: (s.notice?.id ?? 0) + 1, label, action, sticky } })),
  dismissNotice: () => set({ notice: null }),

  startFirstSteps: (spaceName) => set({ firstStep: 'add', firstStepSpace: spaceName }),

  // Asked once each. A step ends the moment the move is made rather than after a
  // count of seconds: it has said everything it had to say, and a card that stays
  // up over the move it was teaching is in the way.
  passFirstStep: (step) => {
    if (get().firstStep !== step) return;
    const next = { add: 'tidy', tidy: 'drag', drag: 'done' } as const;
    set({ firstStep: next[step] });
  },

  setFirstStepSample: (firstStepSampleId) => set({ firstStepSampleId }),

  endFirstSteps: () => set({ firstStep: null, firstStepSpace: '' }),

  // The main process owns the real state and hands it back; the flag here is only
  // so the button can show which way it goes next.
  toggleFullscreen: () => {
    void window.windowMode?.toggleFullscreen().then((on) => set({ isFullscreen: on }));
  },

  /**
   * 바가 스스로 들어가는 시계. 마우스가 바를 벗어나면 바로 들어가지만, 페이지는
   * 다른 프로세스가 입력을 받아서 그 이벤트가 안 올 수 있다 — 그래서 시계를 항상
   * 건다. 바 위에서 마우스가 움직이는 동안은 계속 갱신되고, 주소창에 커서가 있는
   * 동안은 CSS(`:focus-within`)가 붙잡는다.
   */
  showTopBars: () => {
    if (topBarsTimer !== null) clearTimeout(topBarsTimer);
    topBarsTimer = setTimeout(() => set({ isTopBarsOut: false }), 3000);
    set({ isTopBarsOut: true });
  },

  hideTopBars: () => {
    if (topBarsTimer !== null) clearTimeout(topBarsTimer);
    topBarsTimer = null;
    set({ isTopBarsOut: false });
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
 * The part of the window the canvas owns, in window coordinates. Chrome (the
 * rail, the top strip) sits outside it, so arranging and fitting never park a
 * widget underneath it — the top strip in particular used to clip the first row.
 */
export function canvasArea(): Rect {
  const left = useUiStore.getState().isSidebarOpen ? RAIL_WIDTH : 0;
  return {
    x: left,
    y: TOP_CHROME_HEIGHT,
    width: Math.max(1, window.innerWidth - left),
    height: Math.max(1, window.innerHeight - TOP_CHROME_HEIGHT),
  };
}
