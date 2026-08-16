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
});

contextBridge.exposeInMainWorld('browserView', {
  sync: (
    id: string,
    spaceId: string,
    url: string,
    rect: { x: number; y: number; width: number; height: number },
    zoom: number,
    area: { x: number; y: number; width: number; height: number },
    covered: boolean
  ) => ipcRenderer.invoke('browser-view:sync', id, spaceId, url, rect, zoom, area, covered),
  hibernate: (id: string) => ipcRenderer.invoke('browser-view:hibernate', id),
  snapshot: (id: string) => ipcRenderer.invoke('browser-view:snapshot', id),
  destroy: (id: string) => ipcRenderer.invoke('browser-view:destroy', id),
  clearSpaceSession: (spaceId: string) =>
    ipcRenderer.invoke('browser-view:clear-space-session', spaceId),
});
