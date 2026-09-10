import { ipcMain, BrowserWindow } from 'electron';

/**
 * Whether a widget is filling the screen right now.
 *
 * The main process needs to know because ⇧[ and ⇧] are the only way to step
 * between widgets from inside a page, and they are also how `{` and `}` are
 * typed. Swallowing those in every page all the time would break writing code
 * in one, so they are only taken while there is something to step away from.
 */
let maximised = false;
export const isWidgetMaximised = () => maximised;

export function registerWindowModeIpc(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('window:set-maximized', (_event, value: boolean) => {
    maximised = value;
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
