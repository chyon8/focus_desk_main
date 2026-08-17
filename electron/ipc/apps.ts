import { BrowserWindow, ipcMain } from 'electron';
import type { HelperClient } from '../apps/helperClient';
import type { AppInfo } from '../apps/protocol';

/** Long enough for a cold scan of /Applications, short enough to not hang a click. */
const LIST_TIMEOUT_MS = 15_000;

export function registerAppsIpc(helper: HelperClient, getWindow: () => BrowserWindow | null) {
  // The installed set does not change while the app runs and the reply carries an
  // icon per app, so it is fetched once and kept.
  let cached: AppInfo[] | null = null;
  let inFlight: Promise<AppInfo[]> | null = null;

  ipcMain.handle('apps:list', () => {
    if (cached) return cached;
    if (inFlight) return inFlight;

    inFlight = new Promise<AppInfo[]>((resolve) => {
      const finish = (apps: AppInfo[]) => {
        clearTimeout(timer);
        off();
        inFlight = null;
        resolve(apps);
      };
      // No helper (missing binary, or not macOS) means no apps to offer.
      const timer = setTimeout(() => finish([]), LIST_TIMEOUT_MS);
      const off = helper.on((event) => {
        if (event.ev !== 'apps') return;
        cached = event.apps;
        finish(event.apps);
      });
      helper.send({ cmd: 'list' });
    });
    return inFlight;
  });

  ipcMain.handle('apps:launch', (_event, appKey: string) => {
    helper.send({ cmd: 'launch', appKey });
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
