import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { createHelper } from './apps/helperClient';
import { registerActivityIpc } from './ipc/activity';
import { registerAppsIpc } from './ipc/apps';
import { registerStorageIpc } from './ipc/storage';
import { registerImageProtocolScheme, registerImagesIpc } from './ipc/images';
import { registerSpacesIpc } from './ipc/spaces';
import { registerWindowModeIpc } from './ipc/window-mode';

// Privileged schemes must be declared before the app is ready.
registerImageProtocolScheme();

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(__dirname, '../public');

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Browser widgets are <webview> elements: they live inside the canvas and
      // are laid out, scaled and stacked by the page itself (D-029).
      webviewTag: true,
    },
  });

  // Browser widgets reopen on their last URL, so a saved YouTube page would start
  // playing the moment the app launches. Media waits until the user has touched
  // that page — after that, clicking through the site autoplays as usual.
  win.webContents.on('will-attach-webview', (_e, webPreferences) => {
    webPreferences.autoplayPolicy = 'document-user-activation-required';
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'));
  }

  win.on('closed', () => {
    win = null;
  });
}

// ⌘+ arrives as '=' unless shift is down, and the numpad spells it '+'.
const ZOOM_KEYS: Record<string, string> = {
  '=': 'zoom-in',
  '+': 'zoom-in',
  '-': 'zoom-out',
  '0': 'zoom-reset',
};

// Key presses inside a browser widget stay in that page — the app never sees them.
// Without this, clicking into a page while a widget is maximised or the window is
// fullscreen leaves no way out: Esc and ⌃⌘F both go to the site instead.
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() !== 'webview') return;

  // A popup a <webview> opens has no one to display it, so it is always denied.
  // A link that asked for a new tab becomes a **new browser widget** beside the
  // one it was clicked in (D-065) — that is what a tab is, in a space. The id
  // says which guest asked, so the renderer knows where to put it.
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && win && !win.isDestroyed()) {
      win.webContents.send('guest-open-url', url, contents.id);
    }
    return { action: 'deny' };
  });

  contents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || !win || win.isDestroyed()) return;

    if (input.key === 'Escape') win.webContents.send('guest-key', 'escape');
    else if (input.meta && input.control && input.key.toLowerCase() === 'f') {
      win.webContents.send('guest-key', 'fullscreen');
    } else if (input.meta && !input.control && ZOOM_KEYS[input.key]) {
      // Page zoom. The widget owns the value (it persists it), so the chord goes
      // to the renderer rather than straight to this guest's zoom factor — the id
      // says which browser widget was in front.
      e.preventDefault();
      win.webContents.send('guest-key', ZOOM_KEYS[input.key], contents.id);
    } else if (input.alt && !input.meta && !input.control) {
      // Add, arrange and fit. The page keeps plain N/G/F (it may well be typing),
      // so the app's copies are ⌥N/⌥G/⌥F — `code`, because ⌥G arrives as '©'.
      const action =
        input.code === 'KeyN'
          ? 'add'
          : input.code === 'KeyG'
            ? 'arrange'
            : input.code === 'KeyF'
              ? 'fit'
              : null;
      if (!action) return;
      e.preventDefault();
      win.webContents.send('guest-key', action);
    }
  });
});

app.whenReady().then(() => {
  const helper = createHelper();
  app.on('will-quit', helper.stop);

  registerStorageIpc();
  registerSpacesIpc();
  registerImagesIpc();
  registerWindowModeIpc(() => win);
  registerAppsIpc(helper, () => win);
  registerActivityIpc(() => win, helper);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
