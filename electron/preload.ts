import { ipcRenderer, contextBridge, webUtils } from 'electron';

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
  /** Opens the Spotlight pane, where indexing and its exclusions are set. */
  showSpotlightSettings: () => ipcRenderer.invoke('apps:show-spotlight-settings'),
  /** Rect is in window coordinates; the main process adds the window's origin. */
  place: (
    appKey: string,
    rect: { x: number; y: number; width: number; height: number },
    window?: { title?: string; avoid?: string[] },
    raise = true
  ) => ipcRenderer.invoke('apps:place', appKey, rect, window, raise),
  /** Position only, for a window following its widget across the canvas. */
  move: (appKey: string, rect: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.invoke('apps:move', appKey, rect),
  /**
   * Gives the window its own size back. `park` keeps the slot claimed — the
   * widget has only slid off the canvas and the window is expected back (D-072).
   */
  release: (appKey: string, park = false) => ipcRenderer.invoke('apps:release', appKey, park),
  /** Lets go of a window the user has moved somewhere themselves, untouched. */
  detach: (appKey: string) => ipcRenderer.invoke('apps:detach', appKey),
  /** A placed window that moved or resized on its own, in window coordinates. */
  onWindowFrame: (
    handler: (appKey: string, rect: { x: number; y: number; width: number; height: number }) => void
  ) => {
    const listener = (
      _event: unknown,
      appKey: string,
      rect: { x: number; y: number; width: number; height: number }
    ) => handler(appKey, rect);
    ipcRenderer.on('apps:window-frame', listener);
    return () => ipcRenderer.removeListener('apps:window-frame', listener);
  },
  /** Brings the app's window back in front of Focus Desk. */
  raise: (appKey: string) => ipcRenderer.invoke('apps:raise', appKey),
  /** Whether the real windows are on their slots right now. */
  staged: () => ipcRenderer.invoke('apps:staged'),
  /** Asks for the two states; opening an app widget is one of the two ways in. */
  setStaged: (staged: boolean) => ipcRenderer.invoke('apps:set-staged', staged),
  /** The desk moved between its two states (⌃⌥D, or a widget click). */
  onStaged: (handler: (staged: boolean) => void) => {
    const listener = (_event: unknown, staged: boolean) => handler(staged);
    ipcRenderer.on('apps:staged-changed', listener);
    return () => ipcRenderer.removeListener('apps:staged-changed', listener);
  },
  /** What is held hidden right now, for a renderer that has just reloaded. */
  hiddenApps: () => ipcRenderer.invoke('apps:hidden-apps'),
  /** Brings one hidden application back. */
  unhide: (appKey: string) => ipcRenderer.invoke('apps:unhide', appKey),
  /** The applications hidden to keep the desk visible, as a whole set each time. */
  onHidden: (handler: (apps: { appKey: string; name: string }[]) => void) => {
    const listener = (_event: unknown, apps: { appKey: string; name: string }[]) => handler(apps);
    ipcRenderer.on('apps:hidden', listener);
    return () => ipcRenderer.removeListener('apps:hidden', listener);
  },
  /** A placed app quit; its widget goes back to being a launcher. */
  onGone: (handler: (appKey: string) => void) => {
    const listener = (_event: unknown, appKey: string) => handler(appKey);
    ipcRenderer.on('apps:gone', listener);
    return () => ipcRenderer.removeListener('apps:gone', listener);
  },
  /** Which apps count as "still at the desk" while this space is open (D-039). */
  setSpaceApps: (appKeys: string[]) => ipcRenderer.invoke('activity:set-space-apps', appKeys),
  onFrontmost: (handler: (appKey: string | null) => void) => {
    const listener = (_event: unknown, appKey: string | null) => handler(appKey);
    ipcRenderer.on('apps:frontmost', listener);
    return () => ipcRenderer.removeListener('apps:frontmost', listener);
  },
});

contextBridge.exposeInMainWorld('session', {
  /** Which sites this space is signed in on, read from its own cookie jar. */
  summary: (spaceId: string) => ipcRenderer.invoke('session:summary', spaceId),
  /** Signs this space out of one site. */
  clearSite: (spaceId: string, site: string) =>
    ipcRenderer.invoke('session:clear-site', spaceId, site),
  /** Signs this space out of everything: cookies, storage, caches. */
  clear: (spaceId: string) => ipcRenderer.invoke('session:clear', spaceId),
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
  // Saves a picture the app only knows the address of, fetched through the
  // given session so a login-only image still arrives.
  fromUrl: (url: string, partition: string) =>
    ipcRenderer.invoke('images:from-url', url, partition),
});

contextBridge.exposeInMainWorld('backup', {
  /** Opens the folder everything is stored in, in Finder. */
  openFolder: () => ipcRenderer.invoke('backup:open-folder'),
  /** The date of the most recent automatic snapshot, or null. */
  status: () => ipcRenderer.invoke('backup:status'),
  /** Asks where to put a copy; returns the folder written, or null if cancelled. */
  export: () => ipcRenderer.invoke('backup:export'),
  /** Asks for a backup folder and adds what this profile does not have. */
  import: () => ipcRenderer.invoke('backup:import'),
  /** Re-reads the space files, for spaces that have just been imported. */
  reload: () => ipcRenderer.invoke('backup:reload'),
});

contextBridge.exposeInMainWorld('files', {
  // Where a dropped file actually lives. `File.path` was removed in Electron 32;
  // this is the replacement, and it only works from the preload.
  pathFor: (file: File) => webUtils.getPathForFile(file),
});

contextBridge.exposeInMainWorld('windowMode', {
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  setWebDark: (dark: boolean) => ipcRenderer.invoke('window:set-web-dark', dark),
  // Shortcuts pressed while a browser widget had focus, forwarded by the main
  // process. `contentsId` names the guest they were pressed in.
  onGuestKey: (handler: (key: string, contentsId?: number) => void) => {
    const listener = (_event: unknown, key: string, contentsId?: number) =>
      handler(key, contentsId);
    ipcRenderer.on('guest-key', listener);
    return () => ipcRenderer.removeListener('guest-key', listener);
  },
  // A guest asked for a new tab or window. `contentsId` names the guest that
  // asked, so the widget it came from can place the new one next to itself.
  // The user asked, from a page's context menu, for something in it to become a
  // widget. `kind` is 'image' or 'text'; `value` is the address or the passage.
  onGuestToCanvas: (
    handler: (kind: 'image' | 'text', value: string, contentsId: number) => void
  ) => {
    const listener = (_event: unknown, kind: 'image' | 'text', value: string, contentsId: number) =>
      handler(kind, value, contentsId);
    ipcRenderer.on('guest-to-canvas', listener);
    return () => ipcRenderer.removeListener('guest-to-canvas', listener);
  },
  onGuestOpenUrl: (handler: (url: string, contentsId: number) => void) => {
    const listener = (_event: unknown, url: string, contentsId: number) =>
      handler(url, contentsId);
    ipcRenderer.on('guest-open-url', listener);
    return () => ipcRenderer.removeListener('guest-open-url', listener);
  },
});
