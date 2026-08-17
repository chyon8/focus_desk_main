import { app, BrowserWindow, globalShortcut, ipcMain, shell } from 'electron';
import { helperPath, type HelperClient } from '../apps/helperClient';
import type {
  AppInfo,
  HelperCmd,
  HelperEvent,
  Permissions,
  PlaceFailure,
  PlaceResult,
  Rect,
} from '../apps/protocol';

/** Long enough for a cold scan of /Applications, short enough to not hang a click. */
const LIST_TIMEOUT_MS = 15_000;
const ASK_TIMEOUT_MS = 3_000;
const CAPTURE_TIMEOUT_MS = 5_000;
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

  ipcMain.handle('apps:launch', (_event, appKey: string) => {
    helper.send({ cmd: 'launch', appKey });
  });

  ipcMain.handle('apps:permissions', () =>
    ask<Permissions>(
      helper,
      { cmd: 'permissions' },
      (event) =>
        event.ev === 'permissions'
          ? { accessibility: event.accessibility, screenRecording: event.screenRecording }
          : undefined,
      ASK_TIMEOUT_MS,
      { accessibility: false, screenRecording: false }
    )
  );

  ipcMain.handle('apps:ask-capture-access', () => {
    helper.send({ cmd: 'ask-capture-access' });
  });

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

  // One frame, requested again by the renderer for as long as it wants a live
  // thumbnail. Null when the app has no window to capture.
  ipcMain.handle('apps:capture', (_event, appKey: string, maxWidth: number) =>
    ask<string | null>(
      helper,
      { cmd: 'capture', appKey, maxWidth },
      (event) => {
        if (event.ev === 'capture' && event.appKey === appKey) return event.image;
        if (event.ev === 'error' && event.cmd === 'capture') return null;
        return undefined;
      },
      CAPTURE_TIMEOUT_MS,
      null
    )
  );

  // --- Live placement (D-038) ---
  //
  // The renderer measures the widget in window coordinates; turning that into
  // screen coordinates needs the window's own origin, which only the main
  // process knows. Both are top-left points, so this is the whole conversion.

  let live: { appKey: string; rect: Rect } | null = null;
  let followTimer: ReturnType<typeof setTimeout> | null = null;

  const placeCmd = (): HelperCmd | null => {
    const win = getWindow();
    if (!live || !win || win.isDestroyed()) return null;
    const bounds = win.getContentBounds();
    return {
      cmd: 'place',
      appKey: live.appKey,
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

  ipcMain.handle('apps:place', (_event, appKey: string, rect: Rect) => {
    live = { appKey, rect };
    const cmd = placeCmd();
    if (!cmd) return null;

    // Follow the app rather than expecting it to come to us. Its window may live
    // on another Space — a fullscreen app is given one of its own — and macOS has
    // no way to carry a window across. This window can be on all of them, so
    // whichever desktop the app is reached on, the desk is already there (D-041).
    const win = getWindow();
    if (win && !win.isDestroyed()) {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }
    registerReturnShortcut();
    return ask<PlaceResult>(
      helper,
      cmd,
      (event) => {
        if (event.ev === 'placed' && event.appKey === appKey) {
          return { ok: true, resizable: event.resizable, rect: event.rect };
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
      // Focus Desk comes back in front; the app drops behind it rather than being
      // hidden, which is also what keeps it capturable later.
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

  app.on('browser-window-created', (_event, win) => {
    win.on('move', follow);
    win.on('resize', follow);
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
