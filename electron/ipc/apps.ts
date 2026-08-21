import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import { helperPath, type HelperClient } from '../apps/helperClient';
import type {
  AppInfo,
  AppWindows,
  HelperCmd,
  HelperEvent,
  Permissions,
  PlaceFailure,
  PlaceResult,
  Rect,
  WindowChoice,
} from '../apps/protocol';

/** Long enough for a cold scan of /Applications, short enough to not hang a click. */
const LIST_TIMEOUT_MS = 15_000;
const ASK_TIMEOUT_MS = 3_000;
/** The helper keeps waiting for a window while an app starts up; outlast that. */
const PLACE_TIMEOUT_MS = 8_000;
/** Window drags fire continuously; the placed window follows in steps this big. */
const FOLLOW_MS = 60;
/**
 * Brings Focus Desk forward from inside a live app (D-041 follow-up). A global
 * shortcut rather than a widget click because the app owns keyboard and mouse
 * input while it is in front — there is nothing in Focus Desk left to click.
 */
const RETURN_SHORTCUT = 'Alt+Space';
/** Enough for the helper to read one line and write the window back before it dies. */
const RESTORE_GRACE_MS = 250;
/**
 * How long after the last window lands before the stack is put in order. Windows
 * arriving one after another each raise their own app, so the order can only be
 * sorted out once they are all down.
 */
const RAISE_BATCH_MS = 120;

/** Sends a command and waits for the one reply that answers it. */
function ask<T>(
  helper: HelperClient,
  cmd: HelperCmd,
  read: (event: HelperEvent) => T | undefined,
  timeoutMs: number,
  fallback: T
): Promise<T> {
  return new Promise<T>((resolve) => {
    const finish = (value: T) => {
      clearTimeout(timer);
      off();
      resolve(value);
    };
    // No helper (missing binary, or not macOS) simply answers with the fallback.
    const timer = setTimeout(() => finish(fallback), timeoutMs);
    const off = helper.on((event) => {
      const value = read(event);
      if (value !== undefined) finish(value);
    });
    helper.send(cmd);
  });
}

export function registerAppsIpc(helper: HelperClient, getWindow: () => BrowserWindow | null) {
  // The installed set does not change while the app runs and the reply carries an
  // icon per app, so it is fetched once and kept.
  let cached: AppInfo[] | null = null;
  let listing: Promise<AppInfo[]> | null = null;

  ipcMain.handle('apps:list', async () => {
    if (cached) return cached;
    if (!listing) {
      listing = ask<AppInfo[]>(
        helper,
        { cmd: 'list' },
        (event) => (event.ev === 'apps' ? event.apps : undefined),
        LIST_TIMEOUT_MS,
        []
      ).then((apps) => {
        listing = null;
        if (apps.length > 0) cached = apps;
        return apps;
      });
    }
    return listing;
  });

  ipcMain.handle('apps:launch', (_event, appKey: string, activate = true) => {
    helper.send({ cmd: 'launch', appKey, activate });
  });

  // Asked for when the user opens the widget's window list, not on a timer.
  ipcMain.handle('apps:windows', (_event, appKey: string) =>
    ask<AppWindows>(
      helper,
      { cmd: 'windows', appKey },
      (event) =>
        event.ev === 'windows' && event.appKey === appKey
          ? { running: event.running, windows: event.windows, elsewhere: event.elsewhere }
          : undefined,
      ASK_TIMEOUT_MS,
      { running: false, windows: [], elsewhere: 0 }
    )
  );

  ipcMain.handle('apps:permissions', () =>
    ask<Permissions>(
      helper,
      { cmd: 'permissions' },
      (event) => (event.ev === 'permissions' ? { accessibility: event.accessibility } : undefined),
      ASK_TIMEOUT_MS,
      { accessibility: false }
    )
  );

  // Accessibility normally adds itself to the list when first asked for. This is
  // for when it did not: the pane, and the binary to drag into it, which is the
  // helper rather than the app bundle because the helper is what asks.
  ipcMain.handle('apps:show-accessibility-settings', async () => {
    await shell.openExternal(
      'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
    );
    shell.showItemInFolder(helperPath());
    return helperPath();
  });

  // --- Live placement (D-038) ---
  //
  // The renderer measures the widget in window coordinates; turning that into
  // screen coordinates needs the window's own origin, which only the main
  // process knows. Both are top-left points, so this is the whole conversion.

  interface Live {
    appKey: string;
    rect: Rect;
    title?: string;
    avoid?: string[];
  }
  /**
   * Every app whose real window is currently sitting on a widget. Keyed by app
   * because the helper is — one window per app is what buys us no window ids at
   * all (D-040). Insertion order is the order they were asked for, which is
   * widget stacking order.
   */
  const live = new Map<string, Live>();
  // Whether the desk is currently parked under every ordinary window.
  let behind = false;
  // Apps that have been asked to come to the front and have not landed yet.
  const arriving = new Set<string>();
  let followTimer: ReturnType<typeof setTimeout> | null = null;
  let raiseTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Parks the desk below every ordinary window, or brings it back to its own
   * level. While apps are open this is what makes them stay visible: two windows
   * of different apps share no z-order, so with the desk at the normal level any
   * click on it buries every app behind it and the only way back is a shortcut.
   * One level down and the app windows simply float over their widgets — the desk
   * is the surface they sit on, which is the whole idea.
   */
  const setBehind = (next: boolean) => {
    behind = next;
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    if (next) win.setAlwaysOnTop(true, 'normal', -1);
    // Fullscreen wants the opposite: over the menu bar, which is what it is for
    // (D-051). Anything else goes back to an ordinary window.
    else if (win.isSimpleFullScreen()) win.setAlwaysOnTop(true, 'main-menu', 1);
    else win.setAlwaysOnTop(false);
  };

  /** Window coordinates to screen coordinates: both are top-left points. */
  const toScreen = (rect: Rect): Rect | null => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return null;
    const bounds = win.getContentBounds();
    return {
      x: Math.round(bounds.x + rect.x),
      y: Math.round(bounds.y + rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  };

  // Moving this window moves every widget with it, so the windows sitting on them
  // have to come along. Position only, and never raised: this is the desk being
  // dragged, not the user asking for an app.
  const follow = () => {
    if (live.size === 0 || followTimer) return;
    followTimer = setTimeout(() => {
      followTimer = null;
      for (const entry of live.values()) {
        const rect = toScreen(entry.rect);
        if (rect) helper.send({ cmd: 'move', appKey: entry.appKey, rect });
      }
    }, FOLLOW_MS);
  };

  // Round-tripping through the desk and back is otherwise a dead end: two real
  // windows have no shared z-order, so Focus Desk coming forward (any click on
  // it) buries the apps with no way back short of Mission Control.
  const registerReturnShortcut = () => {
    if (globalShortcut.isRegistered(RETURN_SHORTCUT)) return;
    globalShortcut.register(RETURN_SHORTCUT, () => {
      const win = getWindow();
      if (!win || win.isDestroyed()) return;
      // A toggle between the two layers: the desk over everything to work on the
      // canvas itself, or back under the apps to work in them.
      if (behind) {
        setBehind(false);
        win.focus();
      } else {
        setBehind(true);
        for (const appKey of live.keys()) helper.send({ cmd: 'raise', appKey });
      }
    });
  };

  ipcMain.handle(
    'apps:place',
    (_event, appKey: string, rect: Rect, window?: WindowChoice, raise = true) => {
      const entry: Live = { appKey, rect, title: window?.title, avoid: window?.avoid };
      live.set(appKey, entry);
      const screen = toScreen(rect);
      if (!screen) {
        live.delete(appKey);
        return null;
      }

      const win = getWindow();
      if (win && !win.isDestroyed()) {
        // Follow the app rather than expecting it to come to us. Its window may
        // live on another Space — a fullscreen app is given one of its own — and
        // macOS has no way to carry a window across. This window can be on all of
        // them, so whichever desktop the app is reached on, the desk is already
        // there (D-041).
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        // That call also raises this window's level on macOS, and nothing another
        // app can do puts its window above that — raising the app looks like it
        // does nothing at all. Fullscreen made this obvious (D-051); the same
        // thing happens in a windowed desk. Going a level *below* normal fixes it
        // and keeps the apps visible for good.
        setBehind(true);
      }
      registerReturnShortcut();
      if (raise) arriving.add(appKey);

      return ask<PlaceResult>(
        helper,
        { cmd: 'place', appKey, title: entry.title, avoid: entry.avoid, rect: screen, raise },
        (event) => {
          if (event.ev === 'placed' && event.appKey === appKey) {
            return { ok: true, resizable: event.resizable, title: event.title, rect: event.rect };
          }
          if (event.ev === 'error' && event.cmd === 'place') {
            return { ok: false, reason: event.reason as PlaceFailure };
          }
          return undefined;
        },
        PLACE_TIMEOUT_MS,
        { ok: false, reason: 'unknown' }
      );
    }
  );

  // The widget slid across the canvas. Only the origin changes, because resizing
  // is what makes an app lay itself out again.
  ipcMain.handle('apps:move', (_event, appKey: string, rect: Rect) => {
    const entry = live.get(appKey);
    if (!entry) return;
    entry.rect = rect;
    const screen = toScreen(rect);
    if (screen) helper.send({ cmd: 'move', appKey, rect: screen });
  });

  /**
   * Lets go of a window without touching it: the user has taken it somewhere of
   * their own, and putting it back would be arguing with them. The helper keeps
   * the size it had before, so sending it back later still works.
   */
  ipcMain.handle('apps:detach', (_event, appKey: string) => {
    if (!live.delete(appKey)) return;
    arriving.delete(appKey);
    if (live.size > 0) return;
    globalShortcut.unregister(RETURN_SHORTCUT);
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    win.setVisibleOnAllWorkspaces(false);
    setBehind(false);
  });

  ipcMain.handle('apps:release', (_event, appKey: string) => {
    const wasLive = live.delete(appKey);
    arriving.delete(appKey);
    helper.send({ cmd: 'restore', appKey });
    // Only the last one out puts the desk back: letting go of one window must not
    // pull Focus Desk in front of the ones still open.
    if (!wasLive || live.size > 0) return;
    globalShortcut.unregister(RETURN_SHORTCUT);
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    win.setVisibleOnAllWorkspaces(false);
    setBehind(false);
    // Focus Desk comes back in front; the app drops behind it rather than being
    // hidden, so nothing about it changes on the way out.
    win.focus();
  });

  // The mouse-driven half of the round trip: once Focus Desk has come forward
  // (any click on it), clicking the widget again — now visible, since it is what
  // the app was sitting on — brings that app back.
  ipcMain.handle('apps:raise', (_event, appKey: string) => {
    if (!live.has(appKey)) return;
    const win = getWindow();
    if (win && !win.isDestroyed()) win.showInactive();
    helper.send({ cmd: 'raise', appKey });
  });

  // Giving a window its size back is the renderer's cleanup, and that never runs
  // when the desk itself goes away — closing the window or quitting while apps
  // are open leaves them at widget size for good, since the frames they had
  // before are only remembered inside the helper, which dies with us.
  const restoreLive = () => {
    if (live.size === 0) return false;
    setBehind(false);
    for (const appKey of live.keys()) helper.send({ cmd: 'restore', appKey });
    live.clear();
    arriving.clear();
    globalShortcut.unregister(RETURN_SHORTCUT);
    return true;
  };

  // Every window passes through here — devtools, and any popup a page manages to
  // open — so each handler checks it is the desk itself. Closing something else
  // must not hand a placed app its old size back.
  app.on('browser-window-created', (_event, created) => {
    // Deferred: at creation time `getWindow()` has not been assigned yet.
    const isDesk = () => created === getWindow();
    created.on('move', () => isDesk() && follow());
    created.on('resize', () => isDesk() && follow());
    // On macOS this is not a quit: the app stays running with no renderer left to
    // ask for the restore.
    created.on('close', () => {
      if (isDesk()) void restoreLive();
    });
  });

  // The helper is killed on `will-quit`, so the restore has to be sent one step
  // earlier and given a moment to land.
  let leaving = false;
  app.on('before-quit', (event) => {
    if (leaving || !restoreLive()) return;
    leaving = true;
    event.preventDefault();
    setTimeout(() => app.quit(), RESTORE_GRACE_MS);
  });

  app.on('will-quit', () => globalShortcut.unregister(RETURN_SHORTCUT));

  // Once the windows that were asked for have landed, the desk has to be the
  // thing directly behind them. Chasing an app can leave Focus Desk buried on
  // that desktop, which is what makes an app look like it just opened on its own
  // (D-041). In one go rather than per landing: raising the desk between two
  // arrivals buries the one that got there first.
  const raiseArrived = () => {
    raiseTimer = null;
    arriving.clear();
    const win = getWindow();
    if (!win || win.isDestroyed() || live.size === 0) return;
    win.showInactive();
    for (const appKey of live.keys()) helper.send({ cmd: 'raise', appKey });
  };

  helper.on((event) => {
    if (event.ev !== 'placed' || !arriving.has(event.appKey)) return;
    // Every arrival pushes the sort-out back, so an app that took a few retries
    // to start is not left underneath.
    if (raiseTimer) clearTimeout(raiseTimer);
    raiseTimer = setTimeout(raiseArrived, RAISE_BATCH_MS);
  });

  // A window that has moved or resized on its own — dragged by its edge, or sent
  // somewhere by a window manager. Handed over in window coordinates, which is
  // what the widget is measured in.
  helper.on((event) => {
    if (event.ev !== 'window' || !live.has(event.appKey)) return;
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    const bounds = win.getContentBounds();
    win.webContents.send('apps:window-frame', event.appKey, {
      x: event.rect.x - bounds.x,
      y: event.rect.y - bounds.y,
      width: event.rect.width,
      height: event.rect.height,
    });
  });

  // The renderer needs the frontmost app by name, not just the "am I here" flag,
  // so it can bank the seconds against that app (D-039).
  helper.on((event) => {
    if (event.ev !== 'frontmost') return;
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('apps:frontmost', event.appKey);
  });

  helper.send({ cmd: 'watch' });
}
