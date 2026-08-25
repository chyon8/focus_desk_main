import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { NEW_TAB_FRAME } from '../src/widgets/browserLinks';
import { createHelper } from './apps/helperClient';
import { registerActivityIpc } from './ipc/activity';
import { registerAppsIpc } from './ipc/apps';
import { registerStorageIpc } from './ipc/storage';
import { registerImageProtocolScheme, registerImagesIpc } from './ipc/images';
import { registerSessionIpc } from './ipc/session';
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
    // macOS's own fullscreen puts the window on a Space of its own, where no app
    // window can join it — which is the whole app surface (D-038). Turning it off
    // also disables the ⌃⌘F the default menu would otherwise answer with it; the
    // app's own fullscreen is ⇧M.
    fullscreenable: false,
    trafficLightPosition: { x: 10, y: 10 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // App windows sit on top of this one on purpose, and macOS stops sending
      // frames to a window it considers covered — which would stop the loop that
      // keeps those windows on their widgets, exactly when it is needed. The loop
      // runs on a timer for that reason, and this keeps timers at full speed
      // while nothing of the desk is visible.
      backgroundThrottling: false,
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
    // Chromium's own PDF viewer, for a PDF dropped onto the canvas.
    webPreferences.plugins = true;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // Not opened automatically: its front-end asks Electron for Chrome-only
    // debugger domains it does not implement and prints an error per launch
    // ("Autofill.enable failed"), which buries the log this app does write.
    // ⌥⌘I opens it when it is actually wanted.
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'));
  }

  win.on('closed', () => {
    win = null;
  });
}

/** The physical keys ⇧ turns into app shortcuts, matching `useKeyboardShortcuts`. */
const SHIFT_SHORTCUTS = new Set(['KeyN', 'KeyG', 'KeyF', 'KeyM']);

// ⌘+ arrives as '=' unless shift is down, and the numpad spells it '+'.
const ZOOM_KEYS: Record<string, string> = {
  '=': 'zoom-in',
  '+': 'zoom-in',
  '-': 'zoom-out',
  '0': 'zoom-reset',
};

// Key presses inside a browser widget stay in that page — the app never sees them.
// Without this, clicking into a page while a widget is maximised or the window is
// fullscreen leaves no way out: Esc and ⇧M both go to the site instead.
app.on('web-contents-created', (_event, contents) => {
  if (contents.getType() !== 'webview') return;

  // What a page asks for with `window.open` is two different things, and they
  // need opposite answers (D-075).
  //
  // **A tab** — a `target="_blank"` link, which the link shim re-opens by hand
  // under its own window name — becomes a **new browser widget** beside the one
  // it was clicked in (D-065). That is what a tab is, in a space.
  //
  // **A popup** — anything else that reaches here — is how nearly every sign-in
  // works: the site opens a window, waits for it to post back, and closes it.
  // Denying that hands the page `null`, which is exactly what it reports as
  // "popups are blocked". So it gets a real window, sharing this guest's session
  // so it is signed in to the same space.
  //
  // The window name is the discriminator because nothing else is reliable: a
  // popup may carry no features (so `disposition` is an ordinary tab) and may
  // open on `about:blank` with its address set afterwards, which is what Google's
  // sign-in does — a URL test would deny exactly the case this is here for.
  contents.setWindowOpenHandler(({ url, frameName }) => {
    if (frameName === NEW_TAB_FRAME) {
      // The id says which guest asked, so the renderer knows where to put it.
      if (/^https?:\/\//.test(url) && win && !win.isDestroyed()) {
        win.webContents.send('guest-open-url', url, contents.id);
      }
      return { action: 'deny' };
    }

    return {
      action: 'allow',
      // No preload and no node: this is someone else's page, and it has no
      // business reaching the app the way a widget's own guest does. Size is left
      // to the features the site asked for.
      overrideBrowserWindowOptions: {
        autoHideMenuBar: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      },
    };
  });

  contents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown' || !win || win.isDestroyed()) return;

    if (input.key === 'Escape') {
      win.webContents.send('guest-key', 'escape');
    } else if (input.meta && !input.control && ZOOM_KEYS[input.key]) {
      // Page zoom. The widget owns the value (it persists it), so the chord goes
      // to the renderer rather than straight to this guest's zoom factor — the id
      // says which browser widget was in front.
      e.preventDefault();
      win.webContents.send('guest-key', ZOOM_KEYS[input.key], contents.id);
    } else if (input.shift && !input.meta && !input.control && !input.alt) {
      // Add, arrange, fit and fullscreen. The page keeps the plain letters (it
      // may well be typing), so the app's copies are ⇧N/⇧G/⇧F/⇧M. `code`, since
      // that is what the renderer matches on too.
      if (!SHIFT_SHORTCUTS.has(input.code)) return;
      e.preventDefault();
      win.webContents.send('guest-key', input.code);
    }
  });
});

app.whenReady().then(() => {
  const helper = createHelper();
  app.on('will-quit', helper.stop);

  registerStorageIpc();
  registerSessionIpc();
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
