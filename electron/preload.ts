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

contextBridge.exposeInMainWorld('apps', {
  list: () => ipcRenderer.invoke('apps:list'),
  launch: (appKey: string) => ipcRenderer.invoke('apps:launch', appKey),
  /** Which of the two macOS permissions this feature needs are granted. */
  permissions: () => ipcRenderer.invoke('apps:permissions'),
  askCaptureAccess: () => ipcRenderer.invoke('apps:ask-capture-access'),
  /** Opens the Accessibility pane and reveals the binary to add; returns its path. */
  showAccessibilitySettings: () => ipcRenderer.invoke('apps:show-accessibility-settings'),
  /** One frame of the app's window as a JPEG data URI, or null if there is none. */
  capture: (appKey: string, maxWidth: number) =>
    ipcRenderer.invoke('apps:capture', appKey, maxWidth),
  /** Rect is in window coordinates; the main process adds the window's origin. */
  place: (appKey: string, rect: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('apps:place', appKey, rect),
  release: (appKey: string) => ipcRenderer.invoke('apps:release', appKey),
  /** Brings the app's window back in front of Focus Desk. */
  raise: (appKey: string) => ipcRenderer.invoke('apps:raise', appKey),
  /** Which apps count as "still at the desk" while this space is open (D-039). */
  setSpaceApps: (appKeys: string[]) => ipcRenderer.invoke('activity:set-space-apps', appKeys),
  onFrontmost: (handler: (appKey: string | null) => void) => {
    const listener = (_event: unknown, appKey: string | null) => handler(appKey);
    ipcRenderer.on('apps:frontmost', listener);
    return () => ipcRenderer.removeListener('apps:frontmost', listener);
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
