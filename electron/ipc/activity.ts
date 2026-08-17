import { app, BrowserWindow, ipcMain, powerMonitor } from 'electron';

/**
 * Is the user actually here?
 *
 * The renderer only counts time while this is true, so the signal has to come
 * from the window rather than the page: clicking into a browser widget moves
 * document focus to that widget's own WebContents, and `document.hasFocus()`
 * would report the app as gone while the user sits watching it.
 *
 * A sleeping or locked machine counts as away even though the window keeps its
 * focus flag through both.
 */
export function registerActivityIpc(getWindow: () => BrowserWindow | null) {
  let away = false;
  // null until the first publish, so the very first state always gets sent.
  let last: boolean | null = null;

  const isActive = () => {
    const win = getWindow();
    return !away && !!win && !win.isDestroyed() && win.isFocused() && !win.isMinimized();
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
