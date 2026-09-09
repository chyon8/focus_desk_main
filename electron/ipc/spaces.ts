import { app, ipcMain, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { partitionFor } from './session';

// One JSON file per space, so saving a space never rewrites the others.
function spacesDir() {
  const dir = path.join(app.getPath('userData'), 'spaces');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fileFor(id: string) {
  // Ids are generated with crypto.randomUUID(), but never let one escape the directory.
  return path.join(spacesDir(), `${path.basename(id)}.json`);
}

/**
 * Writes a space without ever leaving a half-written one behind.
 *
 * `writeFileSync` on the file itself truncates it first, so a crash mid-write
 * left invalid JSON — and `spaces:list` catches a parse failure and drops that
 * space from the list without saying anything, so the space simply vanished.
 * Writing beside it and renaming means the file is either the old one or the
 * new one: a rename over an existing path is atomic on macOS.
 */
function writeSpace(doc: { id: string }) {
  const file = fileFor(doc.id);
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(doc, null, 2), 'utf-8');
  fs.renameSync(temp, file);
}

export function registerSpacesIpc() {
  ipcMain.handle('spaces:list', () => {
    const dir = spacesDir();
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
        } catch {
          return null; // Ignore a corrupt file rather than failing the whole boot.
        }
      })
      .filter(Boolean);
  });

  ipcMain.handle('spaces:save', (_event, doc: { id: string }) => writeSpace(doc));

  // Blocking twin, for the debounced writes still pending when the window goes
  // away: an `invoke` sent from `beforeunload` loses the race with the teardown.
  ipcMain.on('spaces:save-sync', (event, doc: { id: string }) => {
    writeSpace(doc);
    event.returnValue = true;
  });

  ipcMain.handle('spaces:delete', async (_event, id: string) => {
    const file = fileFor(id);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    // The space's cookie jar goes with it (D-074). Left behind, it is a set of
    // live logins for a project that no longer exists, kept on disk for good.
    await session.fromPartition(partitionFor(id)).clearStorageData();
  });
}
