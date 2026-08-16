import { ipcMain, BrowserWindow, WebContentsView, session } from 'electron';
import { overlapsShell, ViewRect } from './overlap';

// Chromium refuses to render outside this zoom range.
const MIN_ZOOM_FACTOR = 0.25;
const MAX_ZOOM_FACTOR = 5;

interface Entry {
  view: WebContentsView;
  url: string;
  zoom: number;
  spaceId: string;
  // False while the view is stepping aside for something it would paint over.
  visible: boolean;
}

const views = new Map<string, Entry>();
// Last painted frame of a view, kept so the renderer can show something in the
// widget's place while the view itself is gone or hidden.
const snapshots = new Map<string, string>();

async function capture(entry: Entry, id: string) {
  try {
    const image = await entry.view.webContents.capturePage();
    if (!image.isEmpty()) snapshots.set(id, image.toDataURL());
  } catch {
    // A view that never painted has nothing to capture.
  }
}

async function hibernate(id: string, win: BrowserWindow | null) {
  const entry = views.get(id);
  if (!entry) return;

  await capture(entry, id);
  destroyView(id, win);
}

// Hiding keeps the page alive — unlike hibernation, this happens while the user
// is dragging a widget or has a popover open, and killing the page there would
// lose scroll position, playback and form state.
async function setVisible(entry: Entry, id: string, visible: boolean) {
  if (entry.visible === visible) return;
  if (!visible) await capture(entry, id);
  entry.visible = visible;
  entry.view.setVisible(visible);
}

function destroyView(id: string, win: BrowserWindow | null) {
  const entry = views.get(id);
  if (!entry) return;
  if (win && !win.isDestroyed()) win.contentView.removeChildView(entry.view);
  entry.view.webContents.close();
  views.delete(id);
}

export function registerBrowserViewIpc(getWindow: () => BrowserWindow | null) {
  // One call per animation frame from the renderer: place the native view where
  // the widget currently sits on screen, and scale its content to match the camera.
  ipcMain.handle(
    'browser-view:sync',
    async (
      _event,
      id: string,
      spaceId: string,
      url: string,
      rect: ViewRect,
      zoom: number,
      area: ViewRect,
      covered: boolean
    ) => {
      const win = getWindow();
      if (!win || win.isDestroyed()) return null;

      // Three reasons to step aside: Chromium cannot render below
      // MIN_ZOOM_FACTOR, a widget is stacked in front (the renderer decides), and
      // the view would paint over the app's own chrome.
      const [winWidth, winHeight] = win.getContentSize();
      const hidden =
        zoom < MIN_ZOOM_FACTOR ||
        covered ||
        overlapsShell(rect, area, { width: winWidth, height: winHeight });

      let entry = views.get(id);
      if (!entry) {
        // Nothing to show yet and nowhere to show it — wait until it is wanted
        // rather than loading a page the user cannot see.
        if (hidden) return snapshots.get(id) ?? null;

        const view = new WebContentsView({
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            // Cookies and logins are scoped to the space, so the same site can be
            // signed in as different accounts in different spaces.
            partition: `persist:space-${spaceId}`,
          },
        });
        view.setBorderRadius(12);
        win.contentView.addChildView(view);
        view.webContents.loadURL(url);
        view.webContents.setWindowOpenHandler(({ url: target }) => {
          view.webContents.loadURL(target);
          return { action: 'deny' };
        });
        entry = { view, url, zoom: 1, spaceId, visible: true };
        views.set(id, entry);
      }

      if (entry.url !== url) {
        entry.url = url;
        entry.view.webContents.loadURL(url);
      }

      // While hidden the view keeps its last bounds and zoom. Both define the
      // page viewport, so following the widget while nothing is on screen would
      // reflow the page for no reason — that is what dropped playback on zoom out.
      if (hidden) {
        await setVisible(entry, id, false);
        return snapshots.get(id) ?? null;
      }

      const zoomFactor = Math.min(MAX_ZOOM_FACTOR, zoom);
      if (entry.zoom !== zoomFactor) {
        entry.zoom = zoomFactor;
        entry.view.webContents.setZoomFactor(zoomFactor);
      }

      // The view is laid out at world size and then scaled by zoomFactor, so its
      // bounds are exactly the on-screen rect the renderer measured. Never trim
      // them: bounds are the page viewport, so trimming reflows the page (D-024).
      entry.view.setBounds({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      });

      await setVisible(entry, id, true);
      return null;
    }
  );

  // Called when a browser widget unmounts — including on every space switch, so
  // inactive spaces hold no live web contents.
  ipcMain.handle('browser-view:hibernate', async (_event, id: string) => {
    await hibernate(id, getWindow());
    return snapshots.get(id) ?? null;
  });

  ipcMain.handle('browser-view:snapshot', (_event, id: string) => snapshots.get(id) ?? null);

  // The widget itself was deleted: drop the snapshot too and clear its storage.
  ipcMain.handle('browser-view:destroy', (_event, id: string) => {
    destroyView(id, getWindow());
    snapshots.delete(id);
  });

  ipcMain.handle('browser-view:clear-space-session', async (_event, spaceId: string) => {
    await session.fromPartition(`persist:space-${spaceId}`).clearStorageData();
  });
}
