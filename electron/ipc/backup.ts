import { app, dialog, ipcMain, shell, type BrowserWindow } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Local backups. There is no account and no server: everything lives in one
 * folder on this machine, so a copy of that folder is the only way the data
 * survives a wiped disk or a new mac.
 *
 * What a backup holds: the space documents, the images they point at, and the
 * key-value store (preferences, web apps, time totals). Not the cookie jars —
 * they are big, and an exported folder should not be a set of live logins.
 */

/** electron-store's default file. */
const PREFS_FILE = 'config.json';
const KEEP = 5;

const userData = () => app.getPath('userData');
const backupsDir = () => path.join(userData(), 'backups');

function today() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Snapshot folder names, oldest first. */
function snapshots() {
  const dir = backupsDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
}

/** Copies the three parts of `root` into `dest`, creating it. */
export function writeBackup(dest: string, root = userData()) {
  fs.mkdirSync(dest, { recursive: true });
  for (const folder of ['spaces', 'images']) {
    const src = path.join(root, folder);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(dest, folder), { recursive: true });
  }
  const prefs = path.join(root, PREFS_FILE);
  if (fs.existsSync(prefs)) fs.copyFileSync(prefs, path.join(dest, PREFS_FILE));
}

/**
 * One snapshot a day, five kept. Called at startup, so a snapshot holds the
 * state the app was last closed in.
 */
export function snapshotIfNeeded() {
  // Nothing to protect yet on a first run.
  if (!fs.existsSync(path.join(userData(), 'spaces'))) return;

  const existing = snapshots();
  if (existing.includes(today())) return;

  try {
    writeBackup(path.join(backupsDir(), today()));
  } catch (error) {
    console.error('[backup] snapshot failed', error);
    return;
  }

  for (const old of snapshots().slice(0, -KEEP)) {
    fs.rmSync(path.join(backupsDir(), old), { recursive: true, force: true });
  }
}

/**
 * Adds what the backup has and this profile does not. A space already here
 * keeps the copy it has — importing never overwrites (D-094).
 */
export function mergeFrom(src: string, root = userData()) {
  let spaces = 0;
  let images = 0;

  const spacesSrc = path.join(src, 'spaces');
  if (fs.existsSync(spacesSrc)) {
    const dest = path.join(root, 'spaces');
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(spacesSrc).filter((f) => f.endsWith('.json'))) {
      const target = path.join(dest, path.basename(file));
      if (fs.existsSync(target)) continue;
      fs.copyFileSync(path.join(spacesSrc, file), target);
      spaces++;
    }
  }

  const imagesSrc = path.join(src, 'images');
  if (fs.existsSync(imagesSrc)) {
    const dest = path.join(root, 'images');
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(imagesSrc)) {
      const target = path.join(dest, path.basename(file));
      if (fs.existsSync(target)) continue;
      fs.copyFileSync(path.join(imagesSrc, file), target);
      images++;
    }
  }

  // Same rule for the key-value store: a key this profile already has wins, so
  // an empty profile gets everything and a used one keeps its own settings.
  const prefsSrc = path.join(src, PREFS_FILE);
  if (fs.existsSync(prefsSrc)) {
    const prefsTarget = path.join(root, PREFS_FILE);
    try {
      const incoming = JSON.parse(fs.readFileSync(prefsSrc, 'utf-8')) as Record<string, unknown>;
      const current = fs.existsSync(prefsTarget)
        ? (JSON.parse(fs.readFileSync(prefsTarget, 'utf-8')) as Record<string, unknown>)
        : {};
      fs.writeFileSync(prefsTarget, JSON.stringify({ ...incoming, ...current }, null, 2), 'utf-8');
    } catch (error) {
      console.error('[backup] could not merge preferences', error);
    }
  }

  return { spaces, images };
}

export function registerBackupIpc(getWindow: () => BrowserWindow | null) {
  ipcMain.handle('backup:open-folder', () => shell.openPath(userData()));

  /** The most recent snapshot's date, for the settings panel to show. */
  ipcMain.handle('backup:status', () => ({ last: snapshots().at(-1) ?? null }));

  ipcMain.handle('backup:export', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Where to put the backup',
      properties: ['openDirectory', 'createDirectory'],
      buttonLabel: 'Back up here',
    });
    if (canceled || !filePaths[0]) return null;

    // A plain folder, not a zip: it can be opened and read without this app.
    let dest = path.join(filePaths[0], `Focus Desk Backup ${today()}`);
    for (let n = 2; fs.existsSync(dest); n++) {
      dest = path.join(filePaths[0], `Focus Desk Backup ${today()} (${n})`);
    }
    writeBackup(dest);
    return dest;
  });

  ipcMain.handle('backup:import', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Pick a backup folder',
      properties: ['openDirectory'],
      buttonLabel: 'Import',
    });
    if (canceled || !filePaths[0]) return null;

    const src = filePaths[0];
    if (!fs.existsSync(path.join(src, 'spaces'))) {
      return { error: 'That folder has no spaces in it.' };
    }
    // The import is on top of live data; a snapshot first makes it undoable.
    snapshotIfNeeded();
    return mergeFrom(src);
  });

  /**
   * The stores read their files once, when the window loads, so imported spaces
   * only appear after a reload. Reloading the window is enough — nothing in the
   * main process holds the data: `spaces:list` reads the folder on every call,
   * and electron-store reads its file on every access.
   */
  ipcMain.handle('backup:reload', () => getWindow()?.webContents.reload());
}
