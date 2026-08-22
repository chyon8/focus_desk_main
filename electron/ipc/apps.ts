import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import { helperPath, type HelperClient } from '../apps/helperClient';
import type {
  AppCatalog,
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
/**
 * How long a scan stands before the next picker asks for a fresh one. Apps get
 * installed while Focus Desk is open, and having to restart to see one is not an
 * answer; a scan only ever runs when the picker is opened, so this is cheap.
 */
const CATALOG_TTL_MS = 60_000;
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
  // The reply carries an icon per app, so a scan is worth holding on to — but
  // only for a while, since the installed set does change under us.
  let cached: AppCatalog | null = null;
  let cachedAt = 0;
  let listing: Promise<AppCatalog> | null = null;

  ipcMain.handle('apps:list', async () => {
    if (cached && Date.now() - cachedAt < CATALOG_TTL_MS) return cached;
    if (!listing) {
      listing = ask<AppCatalog>(
        helper,
        { cmd: 'list' },
        (event) => (event.ev === 'apps' ? { apps: event.apps, spotlight: event.spotlight } : undefined),
        LIST_TIMEOUT_MS,
        { apps: [], spotlight: false }
      ).then((catalog) => {
        listing = null;
        // A scan that timed out is not an answer; leave the last good one in
        // place and let the next picker try again.
        if (catalog.apps.length > 0) {
          cached = catalog;
          cachedAt = Date.now();
        }
        return catalog;
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

  // Where indexing is switched on and off, and which folders it leaves out — the
  // two reasons an app the user owns can be missing from the list (D-068).
  ipcMain.handle('apps:show-spotlight-settings', () =>
    shell.openExternal('x-apple.systempreferences:com.apple.Spotlight-Settings.extension')
  );

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
   * Whether the real windows are on their slots. The desk cannot be above them
   * and below them at once, so this is a state rather than a reaction: it moves
   * on ⌥Space and on a widget being clicked, and on nothing else. Every version
   * of this that changed with an ordinary click flipped every app in the space
   * on every stray click (D-071).
   */
  let staged = false;

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
  /**
   * Moves between the two states and tells the renderer, which is what actually
   * puts the windows back on their slots — it is the only side that knows where
   * the widgets are now. Going the other way leaves every window exactly where
   * it is: they are simply behind the desk, so coming back costs nothing.
   */
  const setStaged = (next: boolean) => {
    staged = next;
    setBehind(next);
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    if (!next) win.focus();
    win.webContents.send('apps:staged-changed', next);
  };

  const registerReturnShortcut = () => {
    if (globalShortcut.isRegistered(RETURN_SHORTCUT)) return;
    globalShortcut.register(RETURN_SHORTCUT, () => setStaged(!staged));
  };

  /**
   * Drops an app from the live set, and puts the desk back at its own level once
   * the last one is gone. Every consequence of a window being here hangs off this
   * map — the desk sitting one level down, and every `raise` that follows it — so
   * an entry that outlives its window parks the desk under everything for good.
   */
  const forget = (appKey: string) => {
    if (!live.delete(appKey)) return false;
    arriving.delete(appKey);
    if (live.size > 0) return true;
    globalShortcut.unregister(RETURN_SHORTCUT);
    const win = getWindow();
    if (win && !win.isDestroyed()) win.setVisibleOnAllWorkspaces(false);
    setStaged(false);
    return true;
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
      }
      registerReturnShortcut();
      // A window arriving on a slot is what being on stage means; the desk goes
      // under it and stays there until ⌥Space says otherwise.
      if (!staged) setStaged(true);
      if (raise) arriving.add(appKey);

      return ask<PlaceResult>(
        helper,
        { cmd: 'place', appKey, title: entry.title, avoid: entry.avoid, rect: screen, raise },
        (event) => {
          if (event.ev === 'placed' && event.appKey === appKey) {
            // Back into window coordinates: where it actually landed is only
            // useful to the widget that has to match it.
            const bounds = win?.getContentBounds();
            const landed = bounds
              ? {
                  x: event.rect.x - bounds.x,
                  y: event.rect.y - bounds.y,
                  width: event.rect.width,
                  height: event.rect.height,
                }
              : rect;
            return { ok: true, resizable: event.resizable, title: event.title, rect: landed };
          }
          if (event.ev === 'error' && event.cmd === 'place') {
            return { ok: false, reason: event.reason as PlaceFailure };
          }
          return undefined;
        },
        PLACE_TIMEOUT_MS,
        { ok: false, reason: 'unknown' }
      ).then((result) => {
        // The app was written down before the helper answered, because following
        // and raising have to work from the first frame. When no window ever
        // landed that entry is a lie, and an expensive one: the desk stays parked
        // below every window with nothing to show for it.
        if (!result.ok) forget(appKey);
        return result;
      });
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
    forget(appKey);
  });

  ipcMain.handle('apps:release', (_event, appKey: string) => {
    const wasLive = forget(appKey);
    helper.send({ cmd: 'restore', appKey });
    // Only the last one out brings the desk forward: letting go of one window
    // must not pull Focus Desk in front of the ones still open. The app drops
    // behind it rather than being hidden, so nothing about it changes on the way
    // out.
    if (!wasLive || live.size > 0) return;
    const win = getWindow();
    if (win && !win.isDestroyed()) win.focus();
  });

  // Which state the desk is in, for a renderer that has just started or reloaded.
  ipcMain.handle('apps:staged', () => staged);

  // Opening an app widget is asking for its window, and a window on a slot means
  // the stage. The renderer asks because it is the side that knows an app was
  // opened; the state itself stays here, where the window level is.
  ipcMain.handle('apps:set-staged', (_event, next: boolean) => {
    if (staged !== next) setStaged(next);
  });

  // The mouse half of the round trip. Clicking a widget while the desk is in
  // front is the second way back on stage — the first being ⌥Space — and it says
  // which app the user meant, so that one comes forward with them.
  ipcMain.handle('apps:raise', (_event, appKey: string) => {
    if (!live.has(appKey)) return;
    if (!staged) setStaged(true);
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
    setStaged(false);
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

  // The app quit while its window was on a widget. Everything that hangs off the
  // live set has to be undone, or the desk stays parked below every window with
  // nothing left to sit under.
  helper.on((event) => {
    if (event.ev !== 'gone' || !forget(event.appKey)) return;
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('apps:gone', event.appKey);
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
