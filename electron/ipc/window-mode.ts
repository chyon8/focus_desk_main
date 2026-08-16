import { ipcMain, BrowserWindow } from 'electron';

const MINI_SIZE = { width: 380, height: 300 };

// Bounds to restore when leaving mini mode.
let normalBounds: Electron.Rectangle | null = null;

export function registerWindowModeIpc(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('window:set-mini', (_event, enabled: boolean) => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return;

    if (enabled) {
      normalBounds = win.getBounds();
      const display = win.getBounds();
      win.setAlwaysOnTop(true, 'floating');
      win.setBounds({
        // Park it near the top-right of wherever the window currently is.
        x: display.x + display.width - MINI_SIZE.width - 24,
        y: display.y + 24,
        ...MINI_SIZE,
      });
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } else {
      win.setAlwaysOnTop(false);
      win.setVisibleOnAllWorkspaces(false);
      if (normalBounds) win.setBounds(normalBounds);
    }
  });
}
