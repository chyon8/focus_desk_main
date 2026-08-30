import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Names the renderer already has. `exposeInMainWorld` on top of one of these
 * throws, and the throw stops the rest of the preload: every bridge after the
 * bad line is missing, so the app loads no spaces and starts on an empty "Home".
 * `chrome` cost exactly that, which is why this is a test and not a comment.
 */
const TAKEN = [
  'chrome',
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'console',
  'crypto',
  'performance',
  'localStorage',
  'sessionStorage',
  'fetch',
  'origin',
  'name',
  'top',
  'parent',
  'self',
];

const source = fs.readFileSync(path.join(__dirname, 'preload.ts'), 'utf-8');

/** The names the preload puts on `window`. */
function exposedNames() {
  return [...source.matchAll(/exposeInMainWorld\(\s*'([^']+)'/g)].map((match) => match[1]);
}

describe('preload', () => {
  it('exposes something', () => {
    expect(exposedNames().length).toBeGreaterThan(0);
  });

  it('never binds a bridge on a name the renderer already has', () => {
    expect(exposedNames().filter((name) => TAKEN.includes(name))).toEqual([]);
  });

  it('exposes each name once', () => {
    const names = exposedNames();
    expect(names).toEqual([...new Set(names)]);
  });
});
