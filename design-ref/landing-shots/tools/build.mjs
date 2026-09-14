// Turns a short space spec into the SpaceDoc the app stores (schema 13).
import fs from 'node:fs';
import path from 'node:path';
import { PROFILE } from './lib.mjs';

/** Same theme + wallpaper pairs as src/onboarding/rooms.ts, plus the two extra rooms. */
export const ROOMS = {
  'summer-lake': { themeId: 'golden-hour', background: '/wallpapers/summer-lake-landing.webp' },
  // The wallpaper already has rain in it; rooms.ts turns particle rain off for that reason.
  'rainy-attic': {
    themeId: 'rainy-night',
    background: '/wallpapers/rainy-attic.webp',
    particles: { kind: 'none', density: 0 },
  },
  'midnight-observatory': { themeId: 'golden-hour', background: '/wallpapers/midnight-observatory.webp' },
  'snowy-railway': { themeId: 'snowfall', background: '/wallpapers/snowy-railway-halt.webp' },
  paper: { themeId: 'paper', background: null },
  editorial: { themeId: 'swiss', background: null },
  aquarium: { themeId: 'golden-hour', background: '/wallpapers/late-summer-aquarium.webp' },
  greenhouse: { themeId: 'snowfall', background: '/wallpapers/winter-lake-greenhouse.webp' },
};

/** Downloads an Unsplash photo (free license) into the profile's images folder. */
export async function localPhoto(unsplashId, width = 1600) {
  const dir = path.join(PROFILE, 'images');
  fs.mkdirSync(dir, { recursive: true });
  const name = `u-${unsplashId}-${width}.jpg`;
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) {
    const info = await (await fetch(`https://unsplash.com/napi/photos/${unsplashId}`)).json();
    if (!info?.urls?.raw) throw new Error(`no photo ${unsplashId}`);
    if (info.premium || info.plus) throw new Error(`paid photo ${unsplashId}`);
    const res = await fetch(`${info.urls.raw}&w=${width}&q=82&fm=jpg`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return `focusdesk-image://local/${name}`;
}

export async function buildSpace(spec) {
  const room = ROOMS[spec.room] ?? {};
  const widgets = {};
  let z = 1;
  for (const w of spec.widgets) {
    const id = `${spec.id}-${w.key}`;
    const data = { ...w.data };
    if (w.type === 'photo' && data.unsplash) {
      data.url = await localPhoto(data.unsplash, data.px ?? 1600);
      delete data.unsplash;
      delete data.px;
    }
    if (w.type === 'photo' && data.file) {
      // A picture made for the board (a swatch, a wordmark), filed like any dropped image.
      const dir = path.join(PROFILE, 'images');
      fs.mkdirSync(dir, { recursive: true });
      const name = `f-${path.basename(data.file)}`;
      fs.copyFileSync(data.file, path.join(dir, name));
      data.url = `focusdesk-image://local/${name}`;
      delete data.file;
    }
    let width = w.w;
    let height = w.h;
    if (w.type === 'column') {
      data.children = (data.children ?? []).map((k) => `${spec.id}-${k}`);
      // Same box as applyColumn in spaceStore.ts: fixed width, height from card count.
      const n = data.children.length;
      width = 300;
      height = 30 + (n ? 10 * 2 + n * 210 + (n - 1) * 8 : 96);
    }
    // A page inside a column is a closed card.
    if ((w.type === 'browser' || w.type === 'webapp') && w.inColumn) data.open = false;
    widgets[id] = {
      id,
      type: w.type,
      x: w.x ?? 0,
      y: w.y ?? 0,
      width: width ?? 300,
      height: height ?? 210,
      z: z++,
      // No colour marks in any shot (2026-09-14, user): specs may still carry `color`; it is dropped here.
      data,
    };
  }
  const background =
    spec.background !== undefined
      ? spec.background
      : room.background
        ? { type: 'IMAGE', value: room.background }
        : null;
  return {
    id: spec.id,
    schemaVersion: 13,
    name: spec.name,
    themeId: spec.themeId ?? room.themeId ?? 'golden-hour',
    background,
    particles: spec.particles !== undefined ? spec.particles : (room.particles ?? null),
    polarity: spec.polarity ?? null,
    pattern: spec.pattern ?? null,
    camera: spec.camera ?? { x: 0, y: 0, zoom: 1 },
    ambience: { rain: 0, fire: 0, cafe: 0 },
    widgets,
  };
}
