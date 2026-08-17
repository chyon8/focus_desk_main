import { app, BrowserWindow, ipcMain, powerMonitor } from 'electron';
import type { HelperClient } from '../apps/helperClient';

/**
 * Is the user actually here?
 *
 * The renderer only counts time while this is true, so the signal has to come
 * from the window rather than the page: clicking into a browser widget moves
 * document focus to that widget's own WebContents, and `document.hasFocus()`
 * would report the app as gone while the user sits watching it.
 *
 * The same problem returns one level up with app widgets: switching to VSCode
 * blurs the window, but the user is working on that space's project. So an app
 * belonging to the current space being frontmost also counts as being here —
 * whether or not this window is visible behind it (D-039).
 *
 * A sleeping or locked machine counts as away even though the window keeps its
 * focus flag through both.
 */
export function registerActivityIpc(
  getWindow: () => BrowserWindow | null,
  helper: HelperClient
) {
  let away = false;
  // null until the first publish, so the very first state always gets sent.
  let last: boolean | null = null;
  /** Bundle ids of the app widgets in the space the user is currently in. */
  let spaceApps = new Set<string>();
  let frontmost: string | null = null;

  const isActive = () => {
    if (away) return false;
    const win = getWindow();
    if (!win || win.isDestroyed()) return false;
    if (frontmost && spaceApps.has(frontmost)) return true;
    return win.isFocused() && !win.isMinimized();
  };

  const publish = () => {
    const next = isActive();
    if (next === last) return;
    last = next;
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('activity:changed', next);
  };

  const setAway = (value: boolean) => {
    away = value;
    publish();
  };

  ipcMain.handle('activity:state', () => isActive());

  // The renderer owns the space document, so it is the one that knows which apps
  // the current space claims.
  ipcMain.handle('activity:set-space-apps', (_event, appKeys: string[]) => {
    spaceApps = new Set(appKeys);
    publish();
  });

  helper.on((event) => {
    if (event.ev !== 'frontmost') return;
    frontmost = event.appKey;
    publish();
  });

  app.on('browser-window-focus', publish);
  app.on('browser-window-blur', publish);
  app.on('browser-window-created', (_event, win) => {
    win.on('minimize', publish);
    win.on('restore', publish);
    win.on('hide', publish);
    win.on('show', publish);
  });

  powerMonitor.on('suspend', () => setAway(true));
  powerMonitor.on('resume', () => setAway(false));
  powerMonitor.on('lock-screen', () => setAway(true));
  powerMonitor.on('unlock-screen', () => setAway(false));
}
