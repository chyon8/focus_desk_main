import { app, BrowserWindow, ipcMain, WebContentsView, BaseWindow, protocol, net } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Register custom protocol for local resources
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-resource', privileges: { secure: true, supportFetchAPI: true, standard: true, bypassCSP: true, stream: true } }
])

// ... (existing code) ...



// ... (existing IPC handlers) ...

// --- Image Upload Handler ---
ipcMain.handle('save-image', async (_, arrayBuffer: ArrayBuffer, name: string) => {
  const userDataPath = app.getPath('userData');
  const backgroundsDir = path.join(userDataPath, 'backgrounds');
  
  if (!fs.existsSync(backgroundsDir)) {
    fs.mkdirSync(backgroundsDir, { recursive: true });
  }

  // Create a unique filename to prevent overwrites/caching issues
  const ext = path.extname(name);
  const hash = crypto.createHash('md5').update(Buffer.from(arrayBuffer)).digest('hex');
  const filename = `${hash}${ext}`;
  const filePath = path.join(backgroundsDir, filename);

  fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
  
  return `local-resource://backgrounds/${filename}`;
});

ipcMain.handle('get-custom-images', async () => {
    const userDataPath = app.getPath('userData');
    const backgroundsDir = path.join(userDataPath, 'backgrounds');
    if (!fs.existsSync(backgroundsDir)) return [];

    const files = fs.readdirSync(backgroundsDir);
    // Filter for image extensions if needed, for now just return all files
    // Return full local-resource URLs
    return files.map(file => `local-resource://backgrounds/${file}`);
});

ipcMain.handle('delete-custom-image', async (_, url: string) => {
    const filename = url.replace('local-resource://backgrounds/', '');
    const userDataPath = app.getPath('userData');
    const filePath = path.join(userDataPath, 'backgrounds', filename);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
    }
    return false;
});

app.whenReady().then(() => {
  // Handle 'local-resource' protocol
  protocol.handle('local-resource', (request) => {
    const url = request.url.replace('local-resource://', '');
    // Decode URL to handle spaces/special chars if any (though we use hash)
    const relativePath = decodeURIComponent(url);
    
    // We only serve from userData/backgrounds for now
    // Expected format: local-resource://backgrounds/filename.jpg
    // URL actually comes as: local-resource://backgrounds/filename.jpg
    
    // Let's strip the 'backgrounds/' prefix if present to map to real dir
    const cleanPath = relativePath.startsWith('backgrounds/') ? relativePath.replace('backgrounds/', '') : relativePath;
    
    const userDataPath = app.getPath('userData');
    const fullPath = path.join(userDataPath, 'backgrounds', cleanPath);

    return net.fetch('file://' + fullPath);
  });

  createWindow();
});

// The built directory structure
//
// ├─┬─ dist
// │ ├─ index.html
// │ ├─ assets
// │ └── ...
// ├─┬─ dist-electron
// │ ├── main.js
// │ └── preload.js
//
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: BrowserWindow | null
const views = new Map<string, WebContentsView>()

function updateViewBounds(id: string, bounds: Electron.Rectangle) {
  const view = views.get(id)
  if (!view || !win) return

  // Adjust bounds relative to the window content area
  // Note: We might need to account for title bar height if it wasn't hidden,
  // but since we use 'hidden' titleBarStyle, (0,0) is the top-left of the window.
  view.setBounds(bounds)
}


function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    titleBarStyle: 'hidden', // Frameless window
    trafficLightPosition: { x: 10, y: 10 }, // Adjust traffic lights
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webviewTag: true
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // Open DevTools in development mode
    win.webContents.openDevTools()
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(process.env.DIST, 'index.html'))
  }
}

// --- BrowserView / WebContentsView IPC Handlers ---

ipcMain.handle('browser-view:create', (_, id: string, url: string, bounds: Electron.Rectangle) => {
  if (!win) return
  
  // If view already exists, just update it
  if (views.has(id)) {
    const view = views.get(id)!
    view.setBounds(bounds)
    return
  }

  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true, // Secure sandbox for external content
    }
  })

  win.contentView.addChildView(view)
  view.setBounds(bounds)
  view.webContents.loadURL(url || 'about:blank')
  
  views.set(id, view)

  // Handle new windows (e.g. target="_blank") by loading in the same view or opening system browser
  view.webContents.setWindowOpenHandler(({ url }) => {
    // Optionally open in default system browser:
    // shell.openExternal(url)
    // return { action: 'deny' }
    
    // For now, let's load it in the same view if possible, or allow it
    // But for a widget, staying inside is usually better.
    view.webContents.loadURL(url)
    return { action: 'deny' }
  })
})

ipcMain.handle('browser-view:update-bounds', (_, id: string, bounds: Electron.Rectangle) => {
  updateViewBounds(id, bounds)
})

ipcMain.handle('browser-view:load', (_, id: string, url: string) => {
  const view = views.get(id)
  if (view) {
      if (!url.startsWith('http')) url = 'https://' + url
      view.webContents.loadURL(url)
  }
})

ipcMain.handle('browser-view:destroy', (_, id: string) => {
  const view = views.get(id)
  if (view && win) {
    // win.contentView.removeChildView(view) // Not strictly necessary if we rely on GC, but good practice
    // Error: removeChildView might not exist on older types, but it's cleaner.
    // Actually in newer Electron, just removing reference and closing might be enough, 
    // but explicit removal is safer.
    try {
        if (win.contentView.children.includes(view)) {
             win.contentView.removeChildView(view)
        }
    } catch (e) { console.error("Error removing view", e) }
    
    // Cleanup
    (view.webContents as any).destroy?.(); 
    views.delete(id)
  }
})

ipcMain.handle('browser-view:control', (_, id: string, action: 'back' | 'forward' | 'reload' | 'stop') => {
  const view = views.get(id)
  if (!view) return

  switch (action) {
    case 'back': if (view.webContents.canGoBack()) view.webContents.goBack(); break;
    case 'forward': if (view.webContents.canGoForward()) view.webContents.goForward(); break;
    case 'reload': view.webContents.reload(); break;
    case 'stop': view.webContents.stop(); break;
  }
})

ipcMain.handle('browser-view:zoom', (_, id: string, factor: number) => {
  const view = views.get(id)
  if (view) {
      view.webContents.setZoomFactor(factor)
  }
})

// ... existing browser-view handlers ...
ipcMain.handle('browser-view:hide', (_, id: string) => {
    const view = views.get(id)
    if (view && win) {
        // Hide by moving off-screen or zero size
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    }
})

// --- Electron Store IPC Handlers ---
import Store from 'electron-store'
const store = new Store()

ipcMain.handle('store:get', (_event, key: string) => {
  return store.get(key)
})

ipcMain.handle('store:set', (_event, key: string, value: any) => {
  store.set(key, value)
})

ipcMain.handle('store:delete', (_event, key: string) => {
  store.delete(key)
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})


