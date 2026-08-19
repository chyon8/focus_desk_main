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
  /** `activate: false` starts it in the background, for a space being entered. */
  launch: (appKey: string, activate = true) =>
    ipcRenderer.invoke('apps:launch', appKey, activate),
  /** The app's open windows on this desktop, plus a count of the ones elsewhere. */
  windows: (appKey: string) => ipcRenderer.invoke('apps:windows', appKey),
  /** Whether macOS lets Focus Desk move windows yet. */
  permissions: () => ipcRenderer.invoke('apps:permissions'),
  /** Opens the Accessibility pane and reveals the binary to add; returns its path. */
  showAccessibilitySettings: () => ipcRenderer.invoke('apps:show-accessibility-settings'),
  /** Rect is in window coordinates; the main process adds the window's origin. */
  place: (
    appKey: string,
    rect: { x: number; y: number; width: number; height: number },
    window?: { title?: string; avoid?: string[] }
  ) => ipcRenderer.invoke('apps:place', appKey, rect, window),
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
  // Only for the flush on window close, where an async write would be dropped.
  saveSync: (doc: unknown) => {
    ipcRenderer.sendSync('spaces:save-sync', doc);
  },
  delete: (id: string) => ipcRenderer.invoke('spaces:delete', id),
});

contextBridge.exposeInMainWorld('images', {
  save: (buffer: ArrayBuffer, fileName: string) =>
    ipcRenderer.invoke('images:save', buffer, fileName),
  wallpapers: () => ipcRenderer.invoke('images:wallpapers'),
});

contextBridge.exposeInMainWorld('windowMode', {
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  // Shortcuts pressed while a browser widget had focus, forwarded by the main
  // process. `contentsId` names the guest they were pressed in.
  onGuestKey: (handler: (key: string, contentsId?: number) => void) => {
    const listener = (_event: unknown, key: string, contentsId?: number) =>
      handler(key, contentsId);
    ipcRenderer.on('guest-key', listener);
    return () => ipcRenderer.removeListener('guest-key', listener);
  },
});
