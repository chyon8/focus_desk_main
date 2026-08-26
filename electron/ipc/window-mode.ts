import { ipcMain, BrowserWindow, nativeTheme } from 'electron';

export function registerWindowModeIpc(getWindow: () => BrowserWindow | null) {
  /**
   * Whether pages are told the reader wants a dark theme (D-084).
   *
   * `themeSource` is what `prefers-color-scheme` answers inside every guest, so
   * a site with a dark theme of its own serves it. Sites without one are left
   * alone — Chromium can force-invert them, but it wrecks logos and photographs,
   * so that is not on the table here.
   */
  ipcMain.handle('window:set-web-dark', (_event, dark: boolean) => {
    nativeTheme.themeSource = dark ? 'dark' : 'system';
    return nativeTheme.shouldUseDarkColors;
  });

  ipcMain.handle('window:toggle-fullscreen', () => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return false;

    // Simple fullscreen, not the native kind: native fullscreen puts the window
    // on a Space of its own, and macOS lets no other app's window join it — which
    // would make live app widgets impossible whenever the desk is fullscreen
    // (D-038). This covers the screen while staying on the current desktop.
    const next = !win.isSimpleFullScreen();
    win.setSimpleFullScreen(next);
    // A live app drops this window's level and puts it back (D-051); leaving
    // fullscreen clears the flag so it cannot outlive the mode that needed it.
    if (!next) win.setAlwaysOnTop(false);
    return next;
  });
}
