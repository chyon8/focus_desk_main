import { ipcRenderer, contextBridge } from 'electron';

contextBridge.exposeInMainWorld('store', {
  get: (key: string) => ipcRenderer.invoke('store:get', key),
  set: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
  delete: (key: string) => ipcRenderer.invoke('store:delete', key),
  // Only for the flush on window close, where an async write would be dropped.
  setSync: (key: string, value: unknown) => {
    ipcRenderer.sendSync('store:set-sync', key, value);
  },
});

contextBridge.exposeInMainWorld('activity', {
  state: () => ipcRenderer.invoke('activity:state'),
  onChange: (handler: (active: boolean) => void) => {
    const listener = (_event: unknown, active: boolean) => handler(active);
    ipcRenderer.on('activity:changed', listener);
    return () => ipcRenderer.removeListener('activity:changed', listener);
  },
});

contextBridge.exposeInMainWorld('spaces', {
  list: () => ipcRenderer.invoke('spaces:list'),
  save: (doc: unknown) => ipcRenderer.invoke('spaces:save', doc),
  delete: (id: string) => ipcRenderer.invoke('spaces:delete', id),
});

contextBridge.exposeInMainWorld('images', {
  save: (buffer: ArrayBuffer, fileName: string) =>
    ipcRenderer.invoke('images:save', buffer, fileName),
  wallpapers: () => ipcRenderer.invoke('images:wallpapers'),
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
