import { app, BrowserWindow } from 'electron';
import path from 'node:path';
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

// Key presses inside a browser widget stay in that page — the app never sees them.
// Without this, clicking into a page while a widget is maximised or the window is
// fullscreen leaves no way out: Esc and ⌃⌘F both go to the site instead.
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() !== 'webview') return;

  contents.on('before-input-event', (_e, input) => {
    if (input.type !== 'keyDown' || !win || win.isDestroyed()) return;

    if (input.key === 'Escape') win.webContents.send('guest-key', 'escape');
    else if (input.meta && input.control && input.key.toLowerCase() === 'f') {
      win.webContents.send('guest-key', 'fullscreen');
    }
  });
});

app.whenReady().then(() => {
  registerStorageIpc();
  registerSpacesIpc();
  registerImagesIpc();
  registerWindowModeIpc(() => win);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
