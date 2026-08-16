import { app, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

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

  ipcMain.handle('spaces:save', (_event, doc: { id: string }) => {
    fs.writeFileSync(fileFor(doc.id), JSON.stringify(doc, null, 2), 'utf-8');
  });

  ipcMain.handle('spaces:delete', (_event, id: string) => {
    const file = fileFor(id);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
}
