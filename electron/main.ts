import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { registerStorageIpc } from './ipc/storage';
import { registerBrowserViewIpc } from './ipc/browser-views';
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

app.whenReady().then(() => {
  registerStorageIpc();
  registerSpacesIpc();
  registerImagesIpc();
  registerBrowserViewIpc(() => win);
  registerWindowModeIpc(() => win);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
