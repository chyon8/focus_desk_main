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

  let live: { appKey: string; rect: Rect; title?: string; avoid?: string[] } | null = null;
  let followTimer: ReturnType<typeof setTimeout> | null = null;

  const placeCmd = (): HelperCmd | null => {
    const win = getWindow();
    if (!live || !win || win.isDestroyed()) return null;
    const bounds = win.getContentBounds();
    return {
      cmd: 'place',
      appKey: live.appKey,
      title: live.title,
      avoid: live.avoid,
      rect: {
        x: Math.round(bounds.x + live.rect.x),
        y: Math.round(bounds.y + live.rect.y),
        width: Math.round(live.rect.width),
        height: Math.round(live.rect.height),
      },
    };
  };

  const sendPlace = () => {
    const cmd = placeCmd();
    if (cmd) helper.send(cmd);
  };

  // Moving or resizing this window moves the widget with it, so the app window
  // has to come along.
  const follow = () => {
    if (!live || followTimer) return;
    followTimer = setTimeout(() => {
      followTimer = null;
      sendPlace();
    }, FOLLOW_MS);
  };

  // Round-tripping through the desk and back is otherwise a dead end: two real
  // windows have no shared z-order, so Focus Desk coming forward (any click on
  // it) buries the app with no way back short of Mission Control — which is
  // exactly what going looking for the app the hard way was.
  const registerReturnShortcut = () => {
    if (globalShortcut.isRegistered(RETURN_SHORTCUT)) return;
    globalShortcut.register(RETURN_SHORTCUT, () => {
      const win = getWindow();
      if (win && !win.isDestroyed()) win.focus();
    });
  };

  ipcMain.handle('apps:place', (_event, appKey: string, rect: Rect, window?: WindowChoice) => {
    live = { appKey, rect, title: window?.title, avoid: window?.avoid };
    const cmd = placeCmd();
    if (!cmd) return null;

    // Follow the app rather than expecting it to come to us. Its window may live
    // on another Space — a fullscreen app is given one of its own — and macOS has
    // no way to carry a window across. This window can be on all of them, so
    // whichever desktop the app is reached on, the desk is already there (D-041).
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      // Fullscreen parks this window above the menu bar — Electron raises its
      // window level to get there — and nothing another app can do puts its
      // window above that level. Raising the app looks like it does nothing, in
      // fullscreen only. Back to the ordinary level for as long as an app is
      // live; the window still covers the screen. (D-051)
      if (win.isSimpleFullScreen()) win.setAlwaysOnTop(false);
    }
    registerReturnShortcut();
    return ask<PlaceResult>(
      helper,
      cmd,
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
  });

  ipcMain.handle('apps:release', (_event, appKey: string) => {
    live = null;
    globalShortcut.unregister(RETURN_SHORTCUT);
    helper.send({ cmd: 'restore', appKey });
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.setVisibleOnAllWorkspaces(false);
      // Back over the menu bar, which is what fullscreen was for (D-051).
      if (win.isSimpleFullScreen()) win.setAlwaysOnTop(true, 'main-menu', 1);
      // Focus Desk comes back in front; the app drops behind it rather than being
      // hidden, so nothing about it changes on the way out.
      win.focus();
    }
  });

  // The mouse-driven half of the same round trip: once Focus Desk has come
  // forward (any click on it, not just the shortcut), clicking the widget again
  // — now visible, since it is what the app was sitting on — brings the app back.
  ipcMain.handle('apps:raise', (_event, appKey: string) => {
    if (!live || live.appKey !== appKey) return;
    const win = getWindow();
    if (win && !win.isDestroyed()) win.showInactive();
    helper.send({ cmd: 'raise', appKey });
  });

  // Giving a window its size back is the renderer's cleanup, and that never runs
  // when the desk itself goes away — closing the window or quitting while an app
  // is live leaves it at the widget's size for good, since the frame it had
  // before is only remembered inside the helper, which dies with us.
  const restoreLive = () => {
    if (!live) return false;
    helper.send({ cmd: 'restore', appKey: live.appKey });
    live = null;
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

  // Once a window has landed, the desk has to be the thing directly behind it.
  // Chasing the app can leave Focus Desk buried on that desktop, which is what
  // makes an app look like it just opened on its own (D-041). Raising the desk
  // first and the app second puts them in the right order.
  helper.on((event) => {
    if (event.ev !== 'placed' || !live || event.appKey !== live.appKey) return;
    const win = getWindow();
    if (!win || win.isDestroyed()) return;
    win.showInactive();
    helper.send({ cmd: 'raise', appKey: event.appKey });
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
