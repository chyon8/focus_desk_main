import { app, ipcMain, net, protocol, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export const IMAGE_SCHEME = 'focusdesk-image';

function imagesDir() {
  const dir = path.join(app.getPath('userData'), 'images');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Must run before app.whenReady(). */
export function registerImageProtocolScheme() {
  protocol.registerSchemesAsPrivileged([
    { scheme: IMAGE_SCHEME, privileges: { secure: true, standard: true, supportFetchAPI: true } },
  ]);
}

const WALLPAPER_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

/** What a downloaded image is filed as, since a URL often has no extension. */
const EXT_FOR_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
};

/** Writes an image into the images directory under its content hash. */
function store(data: Buffer, ext: string) {
  // Content hash as the name: re-adding the same picture reuses one file.
  const name = `${crypto.createHash('sha1').update(data).digest('hex').slice(0, 16)}${ext}`;
  const target = path.join(imagesDir(), name);
  if (!fs.existsSync(target)) fs.writeFileSync(target, data);
  return `${IMAGE_SCHEME}://local/${name}`;
}

export function registerImagesIpc() {
  // The wallpapers folder is a drop zone: whatever is in it shows up in the
  // picker, so adding a picture is copying a file — no code change.
  ipcMain.handle('images:wallpapers', () => {
    const dir = path.join(process.env.VITE_PUBLIC!, 'wallpapers');
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((name) => WALLPAPER_EXTS.has(path.extname(name).toLowerCase()))
      .sort()
      .map((name) => `/wallpapers/${name}`);
  });

  protocol.handle(IMAGE_SCHEME, (request) => {
    // Only ever serve out of the images directory, whatever the URL claims.
    const name = path.basename(decodeURIComponent(new URL(request.url).pathname));
    return net.fetch(`file://${path.join(imagesDir(), name)}`);
  });

  /**
   * A picture the app has only an address for — one sent out of a page (D-081).
   * Fetched through the space's own session, so an image behind a login is the
   * one the user is actually looking at rather than a 403.
   */
  ipcMain.handle('images:from-url', async (_event, url: string, partition: string) => {
    if (!/^https?:\/\//.test(url)) return null;
    try {
      const response = await session.fromPartition(partition).fetch(url);
      if (!response.ok) return null;
      const type = response.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) return null;
      const data = Buffer.from(await response.arrayBuffer());
      return store(data, EXT_FOR_TYPE[type.split(';')[0]] ?? '.png');
    } catch {
      return null;
    }
  });

  ipcMain.handle('images:save', (_event, buffer: ArrayBuffer, fileName: string) => {
    const data = Buffer.from(buffer);
    // Content hash as the name: re-adding the same picture reuses one file.
    return store(data, path.extname(fileName).toLowerCase() || '.png');
  });
}
