import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The module reaches for electron at import; the two functions under test never
// touch it, because the tests give them a root of their own.
vi.mock('electron', () => ({
  app: { getPath: () => '/nowhere' },
  dialog: {},
  ipcMain: { handle: () => {} },
  shell: {},
}));

const { mergeFrom, writeBackup } = await import('./backup');

/** A userData folder with the given spaces, images and preferences. */
function profile(spaces: Record<string, unknown>, images: string[], prefs?: unknown) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fd-'));
  fs.mkdirSync(path.join(root, 'spaces'));
  fs.mkdirSync(path.join(root, 'images'));
  for (const [id, doc] of Object.entries(spaces)) {
    fs.writeFileSync(path.join(root, 'spaces', `${id}.json`), JSON.stringify(doc));
  }
  for (const name of images) fs.writeFileSync(path.join(root, 'images', name), name);
  if (prefs) fs.writeFileSync(path.join(root, 'config.json'), JSON.stringify(prefs));
  return root;
}

const spacesIn = (root: string) => fs.readdirSync(path.join(root, 'spaces')).sort();
const readSpace = (root: string, id: string) =>
  JSON.parse(fs.readFileSync(path.join(root, 'spaces', `${id}.json`), 'utf-8'));
const readPrefs = (root: string) =>
  JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf-8'));

describe('backup', () => {
  it('a backup carries the spaces, the images and the preferences', () => {
    const root = profile({ a: { name: 'Work' } }, ['shot.png'], { 'prefs-v1': { paper: 'light' } });
    const dest = path.join(root, 'out');

    writeBackup(dest, root);

    expect(spacesIn(dest)).toEqual(['a.json']);
    expect(fs.readdirSync(path.join(dest, 'images'))).toEqual(['shot.png']);
    expect(readPrefs(dest)).toEqual({ 'prefs-v1': { paper: 'light' } });
  });

  it('an empty profile gets everything back', () => {
    const source = profile({ a: { name: 'Work' }, b: { name: 'Home' } }, ['shot.png'], {
      'active-space-id': 'a',
    });
    const backup = path.join(source, 'out');
    writeBackup(backup, source);

    const fresh = profile({}, []);
    expect(mergeFrom(backup, fresh)).toEqual({ spaces: 2, images: 1 });
    expect(spacesIn(fresh)).toEqual(['a.json', 'b.json']);
    expect(readPrefs(fresh)).toEqual({ 'active-space-id': 'a' });
  });

  it('a space already here keeps the copy it has', () => {
    const source = profile({ a: { name: 'Old' }, b: { name: 'Home' } }, []);
    const backup = path.join(source, 'out');
    writeBackup(backup, source);

    const target = profile({ a: { name: 'Edited today' } }, []);
    expect(mergeFrom(backup, target)).toEqual({ spaces: 1, images: 0 });
    expect(readSpace(target, 'a')).toEqual({ name: 'Edited today' });
    expect(readSpace(target, 'b')).toEqual({ name: 'Home' });
  });

  it('settings this profile already has win over the backup', () => {
    const source = profile({}, [], { 'prefs-v1': { paper: 'light' }, 'webapps-v1': ['figma'] });
    const backup = path.join(source, 'out');
    writeBackup(backup, source);

    const target = profile({}, [], { 'prefs-v1': { paper: 'theme' } });
    mergeFrom(backup, target);

    expect(readPrefs(target)).toEqual({ 'prefs-v1': { paper: 'theme' }, 'webapps-v1': ['figma'] });
  });
});
