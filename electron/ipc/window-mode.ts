import { ipcMain, BrowserWindow } from 'electron';

export function registerWindowModeIpc(getWindow: () => BrowserWindow | null) {
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
