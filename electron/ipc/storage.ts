import { ipcMain } from 'electron';
import Store from 'electron-store';

// Generic key-value storage. Space documents move to per-space JSON files in Phase 2 (see docs/DECISIONS.md D-005).
export function registerStorageIpc() {
  const store = new Store();

  ipcMain.handle('store:get', (_event, key: string) => store.get(key));
  ipcMain.handle('store:set', (_event, key: string, value: unknown) => {
    store.set(key, value);
  });
  ipcMain.handle('store:delete', (_event, key: string) => {
    store.delete(key);
  });

  // Blocking twin of store:set, for the last write before the window goes away:
  // an `invoke` sent from `beforeunload` loses the race with the teardown.
  ipcMain.on('store:set-sync', (event, key: string, value: unknown) => {
    store.set(key, value);
    event.returnValue = true;
  });
}
