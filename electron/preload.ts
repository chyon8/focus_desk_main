import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('store', {
  get: (key: string) => ipcRenderer.invoke('store:get', key),
  set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  delete: (key: string) => ipcRenderer.invoke('store:delete', key),
});

contextBridge.exposeInMainWorld('spaces', {
  list: () => ipcRenderer.invoke('spaces:list'),
  save: (doc: unknown) => ipcRenderer.invoke('spaces:save', doc),
  delete: (id: string) => ipcRenderer.invoke('spaces:delete', id),
});

contextBridge.exposeInMainWorld('images', {
  save: (buffer: ArrayBuffer, fileName: string) =>
    ipcRenderer.invoke('images:save', buffer, fileName),
});

contextBridge.exposeInMainWorld('windowMode', {
  setMini: (enabled: boolean) => ipcRenderer.invoke('window:set-mini', enabled),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  // Shortcuts pressed while a browser widget had focus, forwarded by the main process.
  onGuestKey: (handler: (key: string) => void) => {
    const listener = (_event: unknown, key: string) => handler(key);
    ipcRenderer.on('guest-key', listener);
    return () => ipcRenderer.removeListener('guest-key', listener);
  },
});
